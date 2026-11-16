using System.Globalization;
using Applications.Contracts;
using ClosedXML.Excel;
using Domain.Entities;

namespace API.Infrastructure.Exports;

/// <summary>Renders a job's candidate pipeline as an .xlsx workbook with "Candidates" and "Summary" sheets.</summary>
public static class CandidateExportWorkbook
{
    public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private const string DateFormat = "dd-mmm-yyyy";
    private const string DateTimeFormat = "dd-mmm-yyyy hh:mm AM/PM";
    private const string LpaFormat = "#,##0.00";

    private static readonly (string Header, double Width)[] Columns =
    [
        ("Candidate", 24), ("Stage", 20), ("Current role", 26), ("Current company", 22), ("Level", 12),
        ("Date of birth", 14), ("Phone", 18), ("Personal email", 28), ("Company email", 28), ("LinkedIn", 34),
        ("Current CTC (LPA)", 16), ("Includes variable", 14), ("Variable (LPA)", 14), ("Expected CTC (LPA)", 16),
        ("Notice period (days)", 14), ("Submitted on", 20), ("Submitted by", 20), ("Interview at", 20),
        ("Rejection reasons", 34), ("Rejection notes", 40), ("Last updated", 20), ("Candidate notes", 50)
    ];

    public static byte[] Build(JobCandidateExport export, TimeZoneInfo timeZone, DateTimeOffset generatedAt)
    {
        using var workbook = new XLWorkbook();
        workbook.Properties.Title = $"{export.JobCode} candidates";
        AddCandidatesSheet(workbook, export, timeZone);
        AddSummarySheet(workbook, export, timeZone, generatedAt);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void AddCandidatesSheet(XLWorkbook workbook, JobCandidateExport export, TimeZoneInfo timeZone)
    {
        var sheet = workbook.Worksheets.Add("Candidates");
        for (var index = 0; index < Columns.Length; index++)
        {
            sheet.Cell(1, index + 1).Value = Columns[index].Header;
            sheet.Column(index + 1).Width = Columns[index].Width;
        }

        var rowNumber = 2;
        foreach (var row in export.Rows)
        {
            var cells = new XLCellValue[]
            {
                row.FullName,
                DisplayNames.Of(row.Stage),
                row.CurrentRole,
                row.CurrentCompany,
                DisplayNames.Of(row.Level),
                row.DateOfBirth.ToDateTime(TimeOnly.MinValue),
                row.Phone,
                row.PersonalEmail,
                Text(row.CompanyEmail),
                Text(row.LinkedInUrl),
                row.CurrentCtcLpa,
                row.CurrentCtcIncludesVariable ? "Yes" : "No",
                row.VariablePayLpa is { } variable ? variable : Blank.Value,
                row.ExpectedCtcLpa,
                row.NoticePeriodDays,
                Local(row.SubmittedAt, timeZone),
                row.SubmittedByName,
                row.InterviewScheduledAt is { } interview ? Local(interview, timeZone) : Blank.Value,
                row.RejectionReasons.Count > 0 ? string.Join(", ", row.RejectionReasons.Select(DisplayNames.Of)) : Blank.Value,
                Text(row.RejectionNotes),
                Local(row.LastUpdatedAt, timeZone),
                Text(row.CandidateNotes)
            };
            for (var index = 0; index < cells.Length; index++)
            {
                // Values are written as typed data, never as formulas, so text such as "=cmd" or
                // "+91 ..." is stored literally and cannot trigger formula injection.
                sheet.Cell(rowNumber, index + 1).Value = cells[index];
            }

            rowNumber++;
        }

        var lastRow = Math.Max(rowNumber - 1, 1);
        if (export.Rows.Count > 0)
        {
            var table = sheet.Range(1, 1, lastRow, Columns.Length).CreateTable("Candidates");
            table.Theme = XLTableTheme.TableStyleMedium2;
            table.ShowAutoFilter = true;
        }
        else
        {
            sheet.Row(1).Style.Font.Bold = true;
            sheet.Cell(2, 1).Value = "No candidates have been submitted to this job yet.";
            sheet.Cell(2, 1).Style.Font.Italic = true;
        }

        FormatColumn(sheet, "Date of birth", DateFormat, lastRow);
        foreach (var header in new[] { "Current CTC (LPA)", "Variable (LPA)", "Expected CTC (LPA)" })
        {
            FormatColumn(sheet, header, LpaFormat, lastRow);
        }

        foreach (var header in new[] { "Submitted on", "Interview at", "Last updated" })
        {
            FormatColumn(sheet, header, DateTimeFormat, lastRow);
        }

        foreach (var header in new[] { "Rejection notes", "Candidate notes" })
        {
            sheet.Column(ColumnOf(header)).Style.Alignment.WrapText = true;
        }

        sheet.Rows().Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
        sheet.SheetView.FreezeRows(1);
        sheet.SheetView.FreezeColumns(1);
    }

    private static void AddSummarySheet(
        XLWorkbook workbook,
        JobCandidateExport export,
        TimeZoneInfo timeZone,
        DateTimeOffset generatedAt)
    {
        var sheet = workbook.Worksheets.Add("Summary");
        sheet.Cell("A1").Value = $"{export.JobCode} · {export.JobTitle}";
        sheet.Cell("A1").Style.Font.Bold = true;
        sheet.Cell("A1").Style.Font.FontSize = 14;

        var details = new (string Label, XLCellValue Value)[]
        {
            ("Company", export.CompanyName),
            ("Job status", DisplayNames.Of(export.JobStatus)),
            ("Location", Text(export.Location)),
            ("Openings", export.Openings),
            ("Total candidates", export.Rows.Count),
            ("Exported at", Local(generatedAt, timeZone)),
            ("Time zone", timeZone.Id)
        };
        var row = 3;
        foreach (var (label, value) in details)
        {
            sheet.Cell(row, 1).Value = label;
            sheet.Cell(row, 1).Style.Font.Bold = true;
            sheet.Cell(row, 2).Value = value;
            row++;
        }

        sheet.Cell(row - 2, 2).Style.NumberFormat.Format = DateTimeFormat;
        sheet.Cell(row - 2, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;

        row++;
        sheet.Cell(row, 1).Value = "Stage";
        sheet.Cell(row, 2).Value = "Candidates";
        sheet.Range(row, 1, row, 2).Style.Font.Bold = true;
        sheet.Range(row, 1, row, 2).Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        foreach (var stage in Enum.GetValues<ApplicationStage>())
        {
            row++;
            sheet.Cell(row, 1).Value = DisplayNames.Of(stage);
            sheet.Cell(row, 2).Value = export.Rows.Count(candidate => candidate.Stage == stage);
        }

        sheet.Column(1).Width = 22;
        sheet.Column(2).Width = 40;
        sheet.Column(2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
    }

    private static void FormatColumn(IXLWorksheet sheet, string header, string format, int lastRow)
    {
        if (lastRow >= 2)
        {
            sheet.Range(2, ColumnOf(header), lastRow, ColumnOf(header)).Style.NumberFormat.Format = format;
        }
    }

    private static int ColumnOf(string header) => Array.FindIndex(Columns, column => column.Header == header) + 1;

    private static XLCellValue Text(string? value) =>
        string.IsNullOrWhiteSpace(value) ? Blank.Value : value;

    /// <summary>Excel has no time zones; convert to the requester's local clock time.</summary>
    private static DateTime Local(DateTimeOffset value, TimeZoneInfo timeZone) =>
        TimeZoneInfo.ConvertTime(value, timeZone).DateTime;

    /// <summary>Builds a safe file name such as "JOB-2026-0005-candidates-2026-11-16.xlsx".</summary>
    public static string FileName(JobCandidateExport export, TimeZoneInfo timeZone, DateTimeOffset generatedAt)
    {
        var date = Local(generatedAt, timeZone).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var code = new string(export.JobCode.Where(ch => char.IsLetterOrDigit(ch) || ch == '-').ToArray());
        return $"{code}-candidates-{date}.xlsx";
    }
}
