/*
FILE: src\components\EmployeeAvatar.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.E_MP_LO_YE_EA_VA_TA_R.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React from 'react';
import type { IdentityProfile } from '../types';
import { getEmployeeSpriteStyle } from '../lib/employeeFaces';
import { cn } from '../lib/utils';

type GridPos = IdentityProfile['gridPos'];

interface EmployeeAvatarProps {
  avatarUrl: string;
  alt: string;
  gridPos?: GridPos;
  className?: string;
}

export default function EmployeeAvatar({
  avatarUrl,
  alt,
  gridPos,
  className,
}: EmployeeAvatarProps) {
  const spriteStyle = gridPos ? getEmployeeSpriteStyle(avatarUrl, gridPos) : undefined;

  if (spriteStyle) {
    return (
      <div className={cn('relative w-full h-full overflow-hidden bg-white', className)}>
        <img
          src={avatarUrl}
          alt={alt}
          className="pointer-events-none absolute"
          draggable={false}
          style={spriteStyle}
        />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={alt}
      className={cn('w-full h-full object-cover', className)}
      referrerPolicy="no-referrer"
    />
  );
}

