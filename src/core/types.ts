export type Direction = 'out' | 'in';

export interface Transaction {
  id: string;
  time: Date;
  amount: number | null;
  direction: Direction;
  category: string;
  description: string;
  person: string;
  source: string; // a parser id, or manual | import
  sourceId: string; // the email's Message-ID, used to skip duplicates
}

export interface Rule {
  keyword: string;
  category: string;
}

/** What a parser returns: no id, member or category yet. */
export interface ParsedEmail {
  amount: number | null;
  direction: Direction;
  description: string;
  time: Date;
  foreign?: { amount: number; currency: string };
}

export interface EmailInput {
  subject: string;
  body: string;
  date?: Date;
}
