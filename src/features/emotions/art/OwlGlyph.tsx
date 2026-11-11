import React from 'react';
import { Owl } from './Owl';
import { FAMILY_COLORS } from '../domain/catalog';

/** The calm owl, small and without its moon: the "Comment je me sens" buttons. */
export const OwlGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <Owl family="calm" color={FAMILY_COLORS.calm} moon="none" className={className} />
);
