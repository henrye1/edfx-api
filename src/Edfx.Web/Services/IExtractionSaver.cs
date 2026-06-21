namespace Edfx.Web.Services;

public interface IExtractionSaver
{
    int Save(string entityId, string section, string raw, int httpStatus, string status, string requestParams);
}
