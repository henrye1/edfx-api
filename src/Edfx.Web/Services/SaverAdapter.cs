using Edfx.Storage;

namespace Edfx.Web.Services;

public class SaverAdapter : IExtractionSaver
{
    private readonly ExtractionRepository _repo;

    public SaverAdapter(ExtractionRepository repo) { _repo = repo; }

    public int Save(string entityId, string section, string raw, int httpStatus, string status)
        => _repo.SaveExtraction(entityId, section, raw, httpStatus, status, "{}").Version;
}
