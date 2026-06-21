using Edfx.Domain;
namespace Edfx.ApiClient;
public interface IEdfxClient
{
    Task<(EntitySearchResponse, string)> SearchAsync(string query, int limit = 20, int offset = 0);
    Task<(string raw, int status)> PostRawAsync(string path, object body);
}
