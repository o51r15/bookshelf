# Library Import Rewrite — Sonarr-Style Implementation Plan

## Overview

Rewrite Library Import to match Sonarr's proven UX: folder-based (one row per author), 
auto-matching via lookup API, inline searchable author selector, batch import.

Currently Bookshelf uses InteractiveImport (file-level scan) which is the wrong abstraction.
Sonarr uses a completely separate system built on unmapped folders from the root folder API.

---

## Sonarr → Bookshelf Translation

| Sonarr Concept        | Bookshelf Equivalent           |
|-----------------------|--------------------------------|
| Series                | Author                         |
| tvdbId                | foreignAuthorId                |
| /series/lookup        | /author/lookup                 |
| /series/import (POST) | /author/import (POST) — NEW    |
| Series Type           | (not needed — drop column)     |
| Season Folder         | (not needed — drop column)     |
| Quality Profile       | Quality Profile (keep)         |
| Monitor               | Monitor (keep)                 |
| —                     | Metadata Profile (add column)  |
| Network badge         | (no equivalent — omit)         |

## Page Flow

```
/import                    → SelectFolder page (pick a root folder)
/import/:rootFolderId      → Import table (one row per unmapped author folder)
```

---

## Phase 1: Backend — Unmapped Folders + Batch Import

### 1A. Add UnmappedFolders to RootFolder

**Goal:** `GET /api/v1/rootfolder` returns `unmappedFolders` — subfolders that don't 
correspond to any existing author's path.

**Files to change:**

- `src/NzbDrone.Core/RootFolders/RootFolder.cs`
  - Add: `public List<UnmappedFolder> UnmappedFolders { get; set; }`

- `src/NzbDrone.Core/RootFolders/RootFolderService.cs`
  - Add `IAuthorService` dependency injection
  - Add new method `AllWithUnmappedFolders()`:
    ```
    For each root folder:
      1. List immediate subdirectories of rootFolder.Path
      2. Get all author paths via _authorService.AllAuthorPaths()
      3. Filter out subdirectories whose path matches an existing author
      4. Remaining dirs = unmappedFolders (name = dir name, path = full path)
    ```
  - Add interface method to `IRootFolderService`
  - Modify `GetDetails()` to also compute unmapped folders, or add separate method

- `src/NzbDrone.Core/RootFolders/UnmappedFolder.cs`
  - Already exists with Name and Path — add `RelativePath` property

- `src/Readarr.Api.V1/RootFolders/RootFolderResource.cs`
  - Add: `public List<UnmappedFolder> UnmappedFolders { get; set; }`
  - Update `ToResource()` mapper to include unmapped folders

- `src/Readarr.Api.V1/RootFolders/RootFolderController.cs`
  - Change `GetRootFolders()` to call `AllWithUnmappedFolders()` instead of `AllWithSpaceStats()`

**Logic for finding unmapped folders:**
```csharp
var subfolders = _diskProvider.GetDirectories(rootFolder.Path);
var authorPaths = _authorService.AllAuthorPaths().Values
    .Select(p => p.ToLowerInvariant()).ToHashSet();

rootFolder.UnmappedFolders = subfolders
    .Where(d => !authorPaths.Contains(d.ToLowerInvariant()))
    .Select(d => new UnmappedFolder { 
        Name = Path.GetFileName(d), 
        Path = d 
    })
    .OrderBy(f => f.Name)
    .ToList();
```

### 1B. Batch Author Import Endpoint

**Goal:** `POST /api/v1/author/import` accepts an array of AuthorResource, adds them all.

**Files to change:**

- `src/Readarr.Api.V1/Author/AuthorImportController.cs` — NEW
  ```csharp
  [V1ApiController("author/import")]
  public class AuthorImportController : Controller
  {
      private readonly IAddAuthorService _addAuthorService;
      
      [HttpPost]
      public object Import([FromBody] List<AuthorResource> resource)
      {
          var newAuthors = resource.Select(r => r.ToModel()).ToList();
          return _addAuthorService.AddAuthors(newAuthors).ToResource();
      }
  }
  ```

- Check if `IAddAuthorService.AddAuthors(List<Author>)` exists. If not, add it — 
  it should loop through and call AddAuthor for each, or batch-insert.

---

## Phase 2: Frontend — New Redux Actions (importAuthorActions.js)

### 2A. Create `Store/Actions/importAuthorActions.js`

This is the core engine, mirroring Sonarr's `importSeriesActions.js`.

**State shape:**
```js
{
  section: 'importAuthor',
  isLookingUpAuthor: false,
  isImporting: false,
  isImported: false,
  importError: null,
  items: [
    {
      id: 'Emily Tesh',              // folder name (used as row key)
      name: 'Emily Tesh',            // display name
      path: '/audiobooks/Emily Tesh', // full path
      relativePath: 'Emily Tesh',     // relative to root
      monitor: 'all',
      qualityProfileId: 1,
      metadataProfileId: 1,
      selectedAuthor: { ... },        // auto-matched or user-picked author object
      items: [],                      // search results array
      isFetching: false,
      isPopulated: false,
      isQueued: false,
      error: null
    }
  ]
}
```

**Actions (mirroring Sonarr exactly):**

1. `QUEUE_LOOKUP_AUTHOR` — Adds folder to lookup queue, marks `isQueued: true`
   - Queue is module-level array (outside Redux), not state
   - `topOfQueue` flag for manual searches (user typed in search box)
   
2. `START_LOOKUP_AUTHOR` — Processes queue one at a time
   - Concurrency = 1 (hardcoded, like Sonarr)
   - Calls `GET /api/v1/author/lookup?term=<folderName>`
   - On success: `selectedAuthor = data[0]` (auto-pick first result)
   - On always: decrement counter, recursively dispatch to process next
   
3. `IMPORT_AUTHOR` — Batch POST
   - Collects selected authors from checked rows
   - Deduplicates by `foreignAuthorId`
   - Builds full author objects via `getNewAuthor()` helper
   - Overrides `path` with the unmapped folder's path
   - `POST /api/v1/author/import` with JSON array
   - On success: removes imported items, refetches root folders

4. `SET_IMPORT_AUTHOR_VALUE` — Per-row field update (monitor, quality, metadata, selectedAuthor)

5. `LOOKUP_UNSEARCHED_AUTHORS` — Re-queue all unmatched items

6. `CANCEL_LOOKUP_AUTHOR` — Empty queue, abort in-flight

7. `CLEAR_IMPORT_AUTHOR` — Reset state on unmount

**Lookup queue pattern (module-level, not Redux):**
```js
let concurrentLookups = 0;
let abortCurrentLookup = null;
const queue = [];
// Exactly like Sonarr — sequential processing, recursive .always() self-dispatch
```

### 2B. Register in Store

- `Store/Actions/index.js` — import and register the new actions module
- Ensure reducers are wired up

---

## Phase 3: Frontend — SelectFolder Page

### 3A. Rewrite `LibraryImportSelectFolder.js`

Match Sonarr's layout:

**Current:** Clickable cards with path + free space  
**Target:** Table with columns: Path | Free Space | Unmapped Folders (count)

Changes:
- Render as a table instead of cards
- Add "Unmapped Folders" column showing `rootFolder.unmappedFolders.length`
- Add page title: "Import authors you already have"
- Add tips section (same as Sonarr pattern)
- Root folder path is a clickable link → navigates to `/import/:id`
- Keep existing navigation logic (onClick → push to `/import/:rootFolderId`)

### 3B. Update `LibraryImportSelectFolderConnector.js`

- No major changes needed — already fetches root folders and handles navigation
- Root folders now include `unmappedFolders` from backend

---

## Phase 4: Frontend — Import Table Page

### 4A. Rewrite `LibraryImportScan.js` → `LibraryImportTable.js`

Complete rewrite. No longer uses InteractiveImport scan.

**Data source:** `props.unmappedFolders` from root folder (not `interactiveImport.items`)

**Columns (matching Sonarr):**
| Column           | Type                | Notes                                    |
|------------------|---------------------|------------------------------------------|
| Checkbox         | Select              | Disabled if no match or existing author  |
| Folder           | Text (read-only)    | Relative folder name                     |
| Monitor          | Dropdown            | All Books / None / etc.                  |
| Quality Profile  | Dropdown            | From qualityProfiles                     |
| Metadata Profile | Dropdown            | From metadataProfiles (Bookshelf-specific)|
| Author           | Searchable selector | Shows matched author or "No match found" |

**Component state (local, not Redux):**
```js
{
  allSelected: false,
  allUnselected: false,
  lastToggled: null,
  selectedState: {}  // { [folderId]: true/false }
}
```

**On mount:**
- Queue lookup for each unmapped folder via `queueLookupAuthor({ name, path, relativePath, term: name })`

**Footer (sticky):**
- Bulk controls: Monitor, Quality Profile, Metadata Profile (applies to selected rows)
- "Import N Authors" button (green, calls `onImportPress(selectedIds)`)

### 4B. Rewrite `LibraryImportScanConnector.js` → `LibraryImportTableConnector.js`

**mapStateToProps:**
```js
- match.params.rootFolderId
- rootFolders (to get unmappedFolders for this root)
- importAuthor state (items, isLookingUpAuthor, isImporting, isImported, importError)
- qualityProfiles
- metadataProfiles  
- addAuthor.defaults (default quality/metadata profile)
- allAuthors (for existing-author detection)
```

**mapDispatchToProps:**
```js
- fetchRootFolders
- queueLookupAuthor
- setImportAuthorValue
- importAuthor (the batch import thunk)
- clearImportAuthor
- cancelLookupAuthor
- setAddAuthorDefault
```

**componentDidMount:**
- Fetch root folders (with unmapped folders)
- Fetch quality profiles, metadata profiles
- Queue lookups for all unmapped folders

**componentWillUnmount:**
- `clearImportAuthor()` — abort lookups, reset state

**onInputChange(ids, name, value):**
- Update default AND push value to all selected rows

**onImportPress(ids):**
- Dispatch `importAuthor({ ids })`
- On success: navigate to library home

### 4C. Rewrite `LibraryImportRow.js` → `LibraryImportRow.js`

Each row represents ONE unmapped folder (= one potential author).

**Props:**
```js
{
  id,              // folder name
  name,            // folder display name
  path,            // full path
  relativePath,    // relative to root
  monitor,         // current monitor selection
  qualityProfileId,
  metadataProfileId,
  selectedAuthor,  // matched author object or null
  items,           // search results array
  isPopulated,     // lookup completed
  isFetching,      // lookup in progress
  isQueued,        // waiting in queue
  isExistingAuthor,// already in library
  isSelected,      // checkbox state
  onSelectedChange,
  onInputChange    // per-row field change
}
```

**Render:**
- Checkbox (disabled if `!selectedAuthor || isExistingAuthor`)
- Folder name (text)
- Monitor dropdown
- Quality Profile dropdown
- Metadata Profile dropdown
- `ImportAuthorSelectAuthor` component (the searchable selector)

### 4D. Create `ImportAuthorSelectAuthor.js` — the searchable author selector

This is the inline search component matching Sonarr's `ImportSeriesSelectSeries`.

**Closed state shows:**
- Loading spinner if `isQueued && !isPopulated`
- Warning icon + "No match found!" if `isPopulated && !selectedAuthor`
- Warning icon + author name + "Existing" badge if `isExistingAuthor`
- Author name (+ poster thumbnail?) if matched normally
- "Search failed, try again" if `error`

**Open state (click to expand):**
- Search input (pre-filled with folder name)
- Refresh button
- Results list (from `/author/lookup` response)
  - Each result: Author name + foreignAuthorId
  - Click to select → `setImportAuthorValue({ id, selectedAuthor })`

**Debounce:** 200ms (setTimeout/clearTimeout, like Sonarr)

**Search:** `queueLookupAuthor({ name: rowId, term: searchText, topOfQueue: true })`

---

## Phase 5: Cleanup

### 5A. Remove old InteractiveImport-based code
- Remove references to `interactiveImportActions` from LibraryImport
- Remove `fetchInteractiveImportItems` usage in import flow
- Keep InteractiveImport itself (still used for manual file import from downloads)

### 5B. CSS
- Update/create CSS modules to match Sonarr's layout
- Table layout with proper column widths
- Sticky footer

### 5C. Update routes
- Ensure `/import` and `/import/:rootFolderId` still route correctly
- Router component (`LibraryImport.js`) may need minor updates

---

## File Inventory

### Backend (C#) — Changes
| File | Action |
|------|--------|
| `RootFolder.cs` | Add `UnmappedFolders` property |
| `UnmappedFolder.cs` | Add `RelativePath` property |
| `RootFolderService.cs` | Add `AllWithUnmappedFolders()`, inject `IAuthorService` |
| `IRootFolderService` | Add interface method |
| `RootFolderResource.cs` | Add `UnmappedFolders` property + mapping |
| `RootFolderController.cs` | Call new method |
| `AuthorImportController.cs` | **NEW** — batch import endpoint |
| `IAddAuthorService` / `AddAuthorService` | Add `AddAuthors(List)` if missing |

### Frontend (JS) — New Files
| File | Purpose |
|------|---------|
| `Store/Actions/importAuthorActions.js` | Redux actions + lookup queue engine |
| `LibraryImport/Import/LibraryImportTable.js` | Main table page component |
| `LibraryImport/Import/LibraryImportTableConnector.js` | Redux connector |
| `LibraryImport/Import/LibraryImportRow.js` | Per-folder row |
| `LibraryImport/Import/LibraryImportRowConnector.js` | Row Redux connector |
| `LibraryImport/Import/LibraryImportFooter.js` | Sticky footer with bulk controls |
| `LibraryImport/Import/LibraryImportFooterConnector.js` | Footer Redux connector |
| `LibraryImport/Import/SelectAuthor/ImportAuthorSelectAuthor.js` | Searchable author selector |
| `LibraryImport/Import/SelectAuthor/ImportAuthorSelectAuthorConnector.js` | Selector connector |

### Frontend (JS) — Modified Files
| File | Change |
|------|--------|
| `LibraryImportSelectFolder.js` | Table layout + unmapped count column |
| `LibraryImport.js` | Route to new table component |
| `Store/Actions/index.js` | Register importAuthorActions |

### Frontend (JS) — Removed/Replaced Files
| File | Replaced By |
|------|-------------|
| `Scan/LibraryImportScan.js` | `Import/LibraryImportTable.js` |
| `Scan/LibraryImportScanConnector.js` | `Import/LibraryImportTableConnector.js` |
| `Scan/LibraryImportRow.js` | `Import/LibraryImportRow.js` |

---

## Implementation Order

1. **Backend: UnmappedFolders** (1A) — get the API returning folder data
2. **Backend: Batch Import** (1B) — add POST /author/import
3. **Frontend: importAuthorActions.js** (2A) — the Redux engine  
4. **Frontend: SelectFolder page** (3A) — show unmapped counts
5. **Frontend: Import table + row** (4A-4C) — the main import UI
6. **Frontend: Author selector** (4D) — the inline search dropdown
7. **Frontend: Cleanup** (5A-5C) — remove old code, CSS polish

Each phase can be committed and tested independently.
