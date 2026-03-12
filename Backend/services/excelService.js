import ExcelJS from "exceljs";

/**
 * Utility to get Roman Year numerals based on batch year.
 */
function getRomanYear(batchYear) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const joinYear = parseInt(batchYear);
    if (isNaN(joinYear)) return "";
    let studyYear = currentYear - joinYear;
    if (currentMonth >= 5) studyYear += 1;
    const numerals = ["", "I", "II", "III", "IV"];
    return numerals[Math.min(Math.max(studyYear, 1), 4)];
}

/**
 * Generates a monthly LeetCode status Excel report.
 */
export async function generateMonthlyExcel(reportData, className, batchYear, month) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Report");

    const romanYear = getRomanYear(batchYear);
    const title = `${romanYear} YEAR B.E. CSE - ${className} SECTION | LEETCODE STATUS - ${month?.toUpperCase()}`;

    // 1. Add Title Header
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // 2. Define Headers
    const headers = [
        "Roll No",
        "Student Name",
        "Week 1",
        "Week 2",
        "Week 3",
        "Week 4",
        "Week 5",
        "Total Count",
        "Performance Status"
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" }
        };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };
    });

    // 3. Add Data
    reportData.forEach((student) => {
        const rowData = [
            student.rollNo,
            student.name.toUpperCase(),
            ...[1, 2, 3, 4, 5].map(week => {
                const wk = student.weeklyPerformance?.find(w => w.weekNumber === week);
                return wk ? wk.solved.total : "-";
            }),
            student.weeklyPerformance?.length > 0
                ? student.weeklyPerformance[student.weeklyPerformance.length - 1].solved.total - (student.startTotal || 0)
                : 0,
            student.overallStatus || "Average"
        ];

        const row = worksheet.addRow(rowData);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });

    // 4. Adjust column widths
    worksheet.columns = [
        { width: 15 }, // Roll No
        { width: 30 }, // Student Name
        { width: 12 }, // Week 1
        { width: 12 }, // Week 2
        { width: 12 }, // Week 3
        { width: 12 }, // Week 4
        { width: 12 }, // Week 5
        { width: 15 }, // Total Count
        { width: 20 }, // Status
    ];

    // 5. Add Signatures
    const emptyRow = worksheet.addRow([]);
    const signatureRow = worksheet.addRow([]);
    signatureRow.getCell(2).value = "Placement Coordinator Signature";
    signatureRow.getCell(8).value = "Head of the Department Signature";
    signatureRow.eachCell((cell) => {
        cell.font = { bold: true };
    });

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}
