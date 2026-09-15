This package contains code to setup tests for live share data objects using a local fluid server.

Code is duplicated and simplified from "@fluid-private/test-version-utils" and "@fluid-private/test-drivers", which are no longer available over npm in fluid v2.

Fluid client dependencies intentionally use `^2.102.0 || ^3.0.0` here. This is an internal, development-only test harness, so we accept the maintenance risk of breaking changes in its legacy, internal, and experimental APIs. Published Live Share packages retain their narrower compatibility ranges.

When checking a specific Fluid version, align all Fluid client dependencies across the test harness and workspace packages to that version, including `@fluid-experimental` and `@fluid-internal` packages. Use a separate installation, rebuild the packages and test utilities, then run the Live Share, canvas, and media test suites; changing only `fluid-framework` can leave incompatible Fluid versions in the same dependency graph.
