using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddSkillLibrary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Skills",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skills", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Skills_IsActive_Category",
                table: "Skills",
                columns: new[] { "IsActive", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_Skills_NormalizedName",
                table: "Skills",
                column: "NormalizedName",
                unique: true);

            // Move existing free-text job skills into the library (category "Other" = 8),
            // matching names case-insensitively so "c#" and "C#" become one skill.
            migrationBuilder.AddColumn<long>(
                name: "SkillId",
                table: "JobSkills",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql("""
                INSERT INTO [Skills] ([Name], [NormalizedName], [Category], [IsActive], [CreatedAt], [IsDeleted])
                SELECT MIN(LTRIM(RTRIM([SkillName]))), UPPER(LTRIM(RTRIM([SkillName]))), 8, 1, SYSDATETIMEOFFSET(), 0
                FROM [JobSkills]
                WHERE LTRIM(RTRIM([SkillName])) <> N''
                GROUP BY UPPER(LTRIM(RTRIM([SkillName])));

                UPDATE [jobSkill]
                SET [jobSkill].[SkillId] = [skill].[Id]
                FROM [JobSkills] AS [jobSkill]
                INNER JOIN [Skills] AS [skill] ON [skill].[NormalizedName] = UPPER(LTRIM(RTRIM([jobSkill].[SkillName])));

                -- Rows with a blank name could not be created through the API; they cannot be mapped.
                DELETE FROM [JobSkills] WHERE [SkillId] = 0;
                """);

            // Starter library: added once, skipping any name already imported above.
            migrationBuilder.Sql("""
                INSERT INTO [Skills] ([Name], [NormalizedName], [Category], [IsActive], [CreatedAt], [IsDeleted])
                SELECT [starter].[Name], [starter].[NormalizedName], [starter].[Category], 1, SYSDATETIMEOFFSET(), 0
                FROM (VALUES
                    (N'C#', N'C#', 0),
                    (N'Java', N'JAVA', 0),
                    (N'Python', N'PYTHON', 0),
                    (N'JavaScript', N'JAVASCRIPT', 0),
                    (N'TypeScript', N'TYPESCRIPT', 0),
                    (N'Go', N'GO', 0),
                    (N'Kotlin', N'KOTLIN', 0),
                    (N'SQL', N'SQL', 0),
                    (N'.NET', N'.NET', 1),
                    (N'ASP.NET Core', N'ASP.NET CORE', 1),
                    (N'Entity Framework', N'ENTITY FRAMEWORK', 1),
                    (N'Spring Boot', N'SPRING BOOT', 1),
                    (N'React', N'REACT', 1),
                    (N'Angular', N'ANGULAR', 1),
                    (N'Node.js', N'NODE.JS', 1),
                    (N'Django', N'DJANGO', 1),
                    (N'SQL Server', N'SQL SERVER', 2),
                    (N'PostgreSQL', N'POSTGRESQL', 2),
                    (N'MySQL', N'MYSQL', 2),
                    (N'MongoDB', N'MONGODB', 2),
                    (N'Redis', N'REDIS', 2),
                    (N'Azure', N'AZURE', 3),
                    (N'AWS', N'AWS', 3),
                    (N'GCP', N'GCP', 3),
                    (N'Docker', N'DOCKER', 3),
                    (N'Kubernetes', N'KUBERNETES', 3),
                    (N'Terraform', N'TERRAFORM', 3),
                    (N'CI/CD', N'CI/CD', 3),
                    (N'Selenium', N'SELENIUM', 4),
                    (N'Playwright', N'PLAYWRIGHT', 4),
                    (N'Unit testing', N'UNIT TESTING', 4),
                    (N'API testing', N'API TESTING', 4),
                    (N'Git', N'GIT', 5),
                    (N'Jira', N'JIRA', 5),
                    (N'Agile', N'AGILE', 6),
                    (N'Scrum', N'SCRUM', 6),
                    (N'Microservices', N'MICROSERVICES', 6),
                    (N'System design', N'SYSTEM DESIGN', 6),
                    (N'Communication', N'COMMUNICATION', 7),
                    (N'Stakeholder management', N'STAKEHOLDER MANAGEMENT', 7),
                    (N'Team leadership', N'TEAM LEADERSHIP', 7)
                ) AS [starter] ([Name], [NormalizedName], [Category])
                WHERE NOT EXISTS (SELECT 1 FROM [Skills] WHERE [Skills].[NormalizedName] = [starter].[NormalizedName]);
                """);

            migrationBuilder.DropColumn(
                name: "SkillName",
                table: "JobSkills");

            migrationBuilder.CreateIndex(
                name: "IX_JobSkills_SkillId",
                table: "JobSkills",
                column: "SkillId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobSkills_Skills_SkillId",
                table: "JobSkills",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobSkills_Skills_SkillId",
                table: "JobSkills");

            migrationBuilder.DropIndex(
                name: "IX_JobSkills_SkillId",
                table: "JobSkills");

            migrationBuilder.AddColumn<string>(
                name: "SkillName",
                table: "JobSkills",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            // Restore the skill names onto job skills before the library is dropped.
            migrationBuilder.Sql("""
                UPDATE [jobSkill]
                SET [jobSkill].[SkillName] = [skill].[Name]
                FROM [JobSkills] AS [jobSkill]
                INNER JOIN [Skills] AS [skill] ON [skill].[Id] = [jobSkill].[SkillId];
                """);

            migrationBuilder.DropColumn(
                name: "SkillId",
                table: "JobSkills");

            migrationBuilder.DropTable(
                name: "Skills");
        }
    }
}
