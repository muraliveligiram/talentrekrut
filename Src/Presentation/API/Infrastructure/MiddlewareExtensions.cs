namespace API.Infrastructure;

public static class MiddlewareExtensions
{
    public static WebApplication UseApiMiddlewares(this WebApplication app)
    {
        // On by default everywhere; set Swagger__Enabled=false to hide the API docs in an environment.
        if (app.Configuration.GetValue("Swagger:Enabled", defaultValue: true))
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "Talent Pool API v1");
                options.DocumentTitle = "Talent Pool API";
                options.EnablePersistAuthorization();
                options.EnableTryItOutByDefault();
                options.DisplayRequestDuration();
            });
        }

        app.UseExceptionHandler();
        app.UseHttpsRedirection();
        // Serves wwwroot/index.html at "/" as a deployment check page (links to /health and /swagger).
        app.UseDefaultFiles();
        app.UseStaticFiles();
        app.UseCors("Frontend");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        return app;
    }
}
