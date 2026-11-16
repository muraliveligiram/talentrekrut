using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidatesAndApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Candidates",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CurrentRole = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CurrentCompany = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    NormalizedPhone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    PersonalEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedPersonalEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CompanyEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CurrentCtcLpa = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    CurrentCtcIncludesVariable = table.Column<bool>(type: "bit", nullable: false),
                    VariablePayLpa = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: true),
                    ExpectedCtcLpa = table.Column<decimal>(type: "decimal(9,2)", precision: 9, scale: 2, nullable: false),
                    NoticePeriodDays = table.Column<int>(type: "int", nullable: false),
                    LinkedInUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SourcedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candidates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Candidates_Users_SourcedByUserId",
                        column: x => x.SourcedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobApplications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CandidateId = table.Column<long>(type: "bigint", nullable: false),
                    JobId = table.Column<long>(type: "bigint", nullable: false),
                    Stage = table.Column<int>(type: "int", nullable: false),
                    SubmittedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    InterviewScheduledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RejectionReasons = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RejectionNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobApplications_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JobApplications_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JobApplications_Users_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ApplicationStageChanges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobApplicationId = table.Column<long>(type: "bigint", nullable: false),
                    FromStage = table.Column<int>(type: "int", nullable: true),
                    ToStage = table.Column<int>(type: "int", nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ChangedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    InterviewScheduledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationStageChanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationStageChanges_JobApplications_JobApplicationId",
                        column: x => x.JobApplicationId,
                        principalTable: "JobApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationStageChanges_Users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationStageChanges_ChangedByUserId",
                table: "ApplicationStageChanges",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationStageChanges_JobApplicationId",
                table: "ApplicationStageChanges",
                column: "JobApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_NormalizedPersonalEmail",
                table: "Candidates",
                column: "NormalizedPersonalEmail");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_NormalizedPhone",
                table: "Candidates",
                column: "NormalizedPhone");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_SourcedByUserId",
                table: "Candidates",
                column: "SourcedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_CandidateId_JobId",
                table: "JobApplications",
                columns: new[] { "CandidateId", "JobId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_JobId_Stage",
                table: "JobApplications",
                columns: new[] { "JobId", "Stage" });

            migrationBuilder.CreateIndex(
                name: "IX_JobApplications_SubmittedByUserId",
                table: "JobApplications",
                column: "SubmittedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationStageChanges");

            migrationBuilder.DropTable(
                name: "JobApplications");

            migrationBuilder.DropTable(
                name: "Candidates");
        }
    }
}
