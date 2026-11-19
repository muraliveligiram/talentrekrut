using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewRoundTrackingAndJoining : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "JoiningDate",
                table: "JobApplications",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotJoiningNotes",
                table: "JobApplications",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotJoiningReasons",
                table: "JobApplications",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<DateOnly>(
                name: "JoiningDate",
                table: "ApplicationStageChanges",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoundName",
                table: "ApplicationStageChanges",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApplicationRounds",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobApplicationId = table.Column<long>(type: "bigint", nullable: false),
                    JobInterviewRoundId = table.Column<long>(type: "bigint", nullable: true),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ScheduledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Outcome = table.Column<int>(type: "int", nullable: false),
                    DecidedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationRounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicationRounds_JobApplications_JobApplicationId",
                        column: x => x.JobApplicationId,
                        principalTable: "JobApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicationRounds_JobInterviewRounds_JobInterviewRoundId",
                        column: x => x.JobInterviewRoundId,
                        principalTable: "JobInterviewRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationRounds_JobApplicationId_Sequence",
                table: "ApplicationRounds",
                columns: new[] { "JobApplicationId", "Sequence" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationRounds_JobInterviewRoundId",
                table: "ApplicationRounds",
                column: "JobInterviewRoundId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationRounds");

            migrationBuilder.DropColumn(
                name: "JoiningDate",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "NotJoiningNotes",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "NotJoiningReasons",
                table: "JobApplications");

            migrationBuilder.DropColumn(
                name: "JoiningDate",
                table: "ApplicationStageChanges");

            migrationBuilder.DropColumn(
                name: "RoundName",
                table: "ApplicationStageChanges");
        }
    }
}
