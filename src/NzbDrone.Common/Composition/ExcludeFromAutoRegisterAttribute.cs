using System;

namespace NzbDrone.Common.Composition
{
    /// <summary>
    /// Marks a class to be excluded from DryIoc auto-registration.
    /// Use for classes that implement auto-discovered interfaces but
    /// must only be instantiated manually (e.g. constructor takes
    /// runtime parameters that DI cannot resolve).
    /// </summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class ExcludeFromAutoRegisterAttribute : Attribute
    {
    }
}
