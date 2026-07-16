using Microsoft.Extensions.DependencyInjection;
using Server.Services;

namespace Server.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddJsonCaseStore(this IServiceCollection services)
        {
            services.AddSingleton<IJsonCaseStore, JsonCaseStore>();
            return services;
        }
    }
}
