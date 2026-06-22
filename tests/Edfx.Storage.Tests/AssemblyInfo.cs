using Xunit;

// These tests share one database and each fixture applies the migrations. Run them
// sequentially so concurrent CREATE TABLE statements don't race on the system catalog.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
