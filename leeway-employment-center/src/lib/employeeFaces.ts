/*
FILE: src\lib\employeeFaces.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.E_MP_LO_YE_EF_AC_ES.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import type { CSSProperties } from 'react';
import type { IdentityProfile } from '../types';
import employeesSetOne from '../public/images/employees-set-one.png';
import employeeSetTwo from '../public/images/employee-set-two.png';
import employeeSetThree from '../public/images/employee-set-three.png';
import employeeSetFour from '../public/images/employee-set-four.png';
import employeeSetFive from '../public/images/employee-set-five.png';

type GridPos = NonNullable<IdentityProfile['gridPos']>;

type FaceSheet = {
  url: string;
  width: number;
  height: number;
  rows: number;
  cols: number;
  reservedFaces: number;
};

const FACE_SHEETS: FaceSheet[] = [
  { url: employeesSetOne, width: 1536, height: 1024, rows: 5, cols: 6, reservedFaces: 10 },
  { url: employeeSetTwo, width: 1536, height: 1024, rows: 4, cols: 5, reservedFaces: 10 },
  { url: employeeSetThree, width: 1536, height: 1024, rows: 5, cols: 5, reservedFaces: 10 },
  { url: employeeSetFour, width: 1774, height: 887, rows: 4, cols: 5, reservedFaces: 10 },
  { url: employeeSetFive, width: 1536, height: 1024, rows: 5, cols: 6, reservedFaces: 10 },
];

const FACE_SHEETS_BY_URL = new Map(FACE_SHEETS.map((sheet) => [sheet.url, sheet]));

export const EMPLOYEE_FACE_ASSIGNMENTS = FACE_SHEETS.flatMap((sheet, fileIndex) =>
  Array.from({ length: sheet.reservedFaces }, (_, faceIndex) => ({
    avatarUrl: sheet.url,
    gridPos: {
      fileIndex,
      row: Math.floor(faceIndex / sheet.cols),
      col: faceIndex % sheet.cols,
      totalRows: sheet.rows,
      totalCols: sheet.cols,
    } satisfies GridPos,
  }))
);

export const getEmployeeSpriteStyle = (
  avatarUrl: string,
  gridPos?: GridPos
): CSSProperties | undefined => {
  if (!gridPos) {
    return undefined;
  }

  const sheet = FACE_SHEETS_BY_URL.get(avatarUrl);

  if (!sheet) {
    return undefined;
  }

  const cellWidth = sheet.width / gridPos.totalCols;
  const cellHeight = sheet.height / gridPos.totalRows;
  const maxCellSide = Math.max(cellWidth, cellHeight);
  const scaledCellWidth = cellWidth / maxCellSide;
  const scaledCellHeight = cellHeight / maxCellSide;
  const offsetX = (1 - scaledCellWidth) / 2;
  const offsetY = (1 - scaledCellHeight) / 2;

  return {
    position: 'absolute',
    maxWidth: 'none',
    width: `${(sheet.width / maxCellSide) * 100}%`,
    height: `${(sheet.height / maxCellSide) * 100}%`,
    left: `${(offsetX - gridPos.col * scaledCellWidth) * 100}%`,
    top: `${(offsetY - gridPos.row * scaledCellHeight) * 100}%`,
    userSelect: 'none',
  };
};

