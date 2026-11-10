/**
 * State tax dates for Calendar → "Your state's tax dates".
 *
 * Sources (checked Nov 2026):
 * - Quarterly sales tax due days: Kintsugi "Sales tax due dates by state" (verified
 *   against state revenue departments); New York's offset quarters from tax.ny.gov.
 * - Estimated income tax: most states follow the federal schedule (Apr 15, Jun 15,
 *   Sep 15, Jan 15). Exceptions confirmed on the state's own site: Iowa
 *   (Apr 30, Jun 30, Sep 30, Jan 31), Hawaii (Apr 20, Jun 20, Sep 20, Jan 20),
 *   Virginia (May 1, Jun 15, Sep 15, Jan 15). Delaware's sources disagree, so no
 *   estimate dates are added for Delaware (the link is still shown).
 * Dates are the usual due day; when it lands on a weekend or holiday it's usually the
 * next business day. Filing frequency (monthly / quarterly / yearly) is set by each state.
 */

/** When a quarterly sales tax return is due, counted from the end of the quarter. */
export type SalesRule =
  | { kind: 'day'; day: number } // that day of the month after the quarter
  | { kind: 'last' } // last day of the month after the quarter
  | { kind: 'thirty' } // 30 days after the quarter ends (Massachusetts)
  | { kind: 'ny' } // New York: quarters end Feb/May/Aug/Nov, due the 20th after
  | { kind: 'none'; why: string } // no quarterly sales tax filing

export type StateTax = {
  code: string
  name: string
  /** Official tax agency home page. */
  url: string
  agency: string
  /** Has a broad individual income tax (so owners of pass-through businesses pay estimates). */
  incomeTax: boolean
  /** Estimated income tax due dates (MM-DD, Q1→Q4); null = not added (see notes). */
  estimated: string[] | null
  sales: SalesRule
  /** A second agency for sales tax when it's not the same as income tax. */
  salesUrl?: string
}

const FED = ['04-15', '06-15', '09-15', '01-15']
const d = (day: number): SalesRule => ({ kind: 'day', day })
const last: SalesRule = { kind: 'last' }
const NO_SALES: SalesRule = { kind: 'none', why: 'No statewide sales tax.' }
const NOT_QUARTERLY: SalesRule = { kind: 'none', why: 'This state doesn’t offer quarterly sales tax filing (monthly or yearly instead).' }

export const STATE_TAXES: StateTax[] = [
  { code: 'AL', name: 'Alabama', agency: 'Alabama Department of Revenue', url: 'https://www.revenue.alabama.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'AK', name: 'Alaska', agency: 'Alaska Department of Revenue', url: 'https://tax.alaska.gov/', incomeTax: false, estimated: null, sales: { kind: 'none', why: 'No statewide sales tax (some cities have their own).' } },
  { code: 'AZ', name: 'Arizona', agency: 'Arizona Department of Revenue', url: 'https://azdor.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'AR', name: 'Arkansas', agency: 'Arkansas Department of Finance and Administration', url: 'https://www.dfa.arkansas.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'CA', name: 'California', agency: 'California Franchise Tax Board', url: 'https://www.ftb.ca.gov/', incomeTax: true, estimated: FED, sales: last, salesUrl: 'https://www.cdtfa.ca.gov/' },
  { code: 'CO', name: 'Colorado', agency: 'Colorado Department of Revenue', url: 'https://tax.colorado.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'CT', name: 'Connecticut', agency: 'Connecticut Department of Revenue Services', url: 'https://portal.ct.gov/drs', incomeTax: true, estimated: FED, sales: last },
  { code: 'DE', name: 'Delaware', agency: 'Delaware Division of Revenue', url: 'https://revenue.delaware.gov/', incomeTax: true, estimated: null, sales: NO_SALES },
  { code: 'DC', name: 'District of Columbia', agency: 'DC Office of Tax and Revenue', url: 'https://otr.cfo.dc.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'FL', name: 'Florida', agency: 'Florida Department of Revenue', url: 'https://floridarevenue.com/', incomeTax: false, estimated: null, sales: d(20) },
  { code: 'GA', name: 'Georgia', agency: 'Georgia Department of Revenue', url: 'https://dor.georgia.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'HI', name: 'Hawaii', agency: 'Hawaii Department of Taxation', url: 'https://tax.hawaii.gov/', incomeTax: true, estimated: ['04-20', '06-20', '09-20', '01-20'], sales: d(20) },
  { code: 'ID', name: 'Idaho', agency: 'Idaho State Tax Commission', url: 'https://tax.idaho.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'IL', name: 'Illinois', agency: 'Illinois Department of Revenue', url: 'https://tax.illinois.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'IN', name: 'Indiana', agency: 'Indiana Department of Revenue', url: 'https://www.in.gov/dor/', incomeTax: true, estimated: FED, sales: NOT_QUARTERLY },
  { code: 'IA', name: 'Iowa', agency: 'Iowa Department of Revenue', url: 'https://revenue.iowa.gov/', incomeTax: true, estimated: ['04-30', '06-30', '09-30', '01-31'], sales: NOT_QUARTERLY },
  { code: 'KS', name: 'Kansas', agency: 'Kansas Department of Revenue', url: 'https://www.ksrevenue.gov/', incomeTax: true, estimated: FED, sales: d(25) },
  { code: 'KY', name: 'Kentucky', agency: 'Kentucky Department of Revenue', url: 'https://revenue.ky.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'LA', name: 'Louisiana', agency: 'Louisiana Department of Revenue', url: 'https://revenue.louisiana.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'ME', name: 'Maine', agency: 'Maine Revenue Services', url: 'https://www.maine.gov/revenue/', incomeTax: true, estimated: FED, sales: d(15) },
  { code: 'MD', name: 'Maryland', agency: 'Comptroller of Maryland', url: 'https://www.marylandtaxes.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'MA', name: 'Massachusetts', agency: 'Massachusetts Department of Revenue', url: 'https://www.mass.gov/orgs/massachusetts-department-of-revenue', incomeTax: true, estimated: FED, sales: { kind: 'thirty' } },
  { code: 'MI', name: 'Michigan', agency: 'Michigan Department of Treasury', url: 'https://www.michigan.gov/taxes', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'MN', name: 'Minnesota', agency: 'Minnesota Department of Revenue', url: 'https://www.revenue.state.mn.us/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'MS', name: 'Mississippi', agency: 'Mississippi Department of Revenue', url: 'https://www.dor.ms.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'MO', name: 'Missouri', agency: 'Missouri Department of Revenue', url: 'https://dor.mo.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'MT', name: 'Montana', agency: 'Montana Department of Revenue', url: 'https://mtrevenue.gov/', incomeTax: true, estimated: FED, sales: NO_SALES },
  { code: 'NE', name: 'Nebraska', agency: 'Nebraska Department of Revenue', url: 'https://revenue.nebraska.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'NV', name: 'Nevada', agency: 'Nevada Department of Taxation', url: 'https://tax.nv.gov/', incomeTax: false, estimated: null, sales: d(20) },
  { code: 'NH', name: 'New Hampshire', agency: 'New Hampshire Department of Revenue Administration', url: 'https://www.revenue.nh.gov/', incomeTax: false, estimated: null, sales: NO_SALES },
  { code: 'NJ', name: 'New Jersey', agency: 'New Jersey Division of Taxation', url: 'https://www.nj.gov/treasury/taxation/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'NM', name: 'New Mexico', agency: 'New Mexico Taxation and Revenue Department', url: 'https://www.tax.newmexico.gov/', incomeTax: true, estimated: FED, sales: d(25) },
  { code: 'NY', name: 'New York', agency: 'New York State Department of Taxation and Finance', url: 'https://www.tax.ny.gov/', incomeTax: true, estimated: FED, sales: { kind: 'ny' } },
  { code: 'NC', name: 'North Carolina', agency: 'North Carolina Department of Revenue', url: 'https://www.ncdor.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'ND', name: 'North Dakota', agency: 'North Dakota Office of State Tax Commissioner', url: 'https://www.tax.nd.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'OH', name: 'Ohio', agency: 'Ohio Department of Taxation', url: 'https://tax.ohio.gov/', incomeTax: true, estimated: FED, sales: NOT_QUARTERLY },
  { code: 'OK', name: 'Oklahoma', agency: 'Oklahoma Tax Commission', url: 'https://oklahoma.gov/tax.html', incomeTax: true, estimated: FED, sales: NOT_QUARTERLY },
  { code: 'OR', name: 'Oregon', agency: 'Oregon Department of Revenue', url: 'https://www.oregon.gov/dor/', incomeTax: true, estimated: FED, sales: NO_SALES },
  { code: 'PA', name: 'Pennsylvania', agency: 'Pennsylvania Department of Revenue', url: 'https://www.revenue.pa.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'RI', name: 'Rhode Island', agency: 'Rhode Island Division of Taxation', url: 'https://tax.ri.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'SC', name: 'South Carolina', agency: 'South Carolina Department of Revenue', url: 'https://dor.sc.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'SD', name: 'South Dakota', agency: 'South Dakota Department of Revenue', url: 'https://dor.sd.gov/', incomeTax: false, estimated: null, sales: NOT_QUARTERLY },
  { code: 'TN', name: 'Tennessee', agency: 'Tennessee Department of Revenue', url: 'https://www.tn.gov/revenue.html', incomeTax: false, estimated: null, sales: d(20) },
  { code: 'TX', name: 'Texas', agency: 'Texas Comptroller of Public Accounts', url: 'https://comptroller.texas.gov/', incomeTax: false, estimated: null, sales: d(20) },
  { code: 'UT', name: 'Utah', agency: 'Utah State Tax Commission', url: 'https://tax.utah.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'VT', name: 'Vermont', agency: 'Vermont Department of Taxes', url: 'https://tax.vermont.gov/', incomeTax: true, estimated: FED, sales: d(25) },
  { code: 'VA', name: 'Virginia', agency: 'Virginia Tax', url: 'https://www.tax.virginia.gov/', incomeTax: true, estimated: ['05-01', '06-15', '09-15', '01-15'], sales: d(20) },
  { code: 'WA', name: 'Washington', agency: 'Washington Department of Revenue', url: 'https://dor.wa.gov/', incomeTax: false, estimated: null, sales: last },
  { code: 'WV', name: 'West Virginia', agency: 'West Virginia Tax Division', url: 'https://tax.wv.gov/', incomeTax: true, estimated: FED, sales: d(20) },
  { code: 'WI', name: 'Wisconsin', agency: 'Wisconsin Department of Revenue', url: 'https://www.revenue.wi.gov/', incomeTax: true, estimated: FED, sales: last },
  { code: 'WY', name: 'Wyoming', agency: 'Wyoming Department of Revenue', url: 'https://revenue.wyo.gov/', incomeTax: false, estimated: null, sales: last },
]

export const stateTax = (code: string) => STATE_TAXES.find((s) => s.code === code) ?? null

const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (month: number) => new Date(2001, month, 0).getDate() // non-leap year; only used for Jan/Apr/Jul/Oct

/** MM-DD due dates for quarterly sales tax returns, in quarter order, with the period each covers. */
export function salesTaxDueDates(rule: SalesRule): { md: string; period: string }[] {
  if (rule.kind === 'none') return []
  if (rule.kind === 'ny') {
    return [
      { md: '06-20', period: 'March–May' },
      { md: '09-20', period: 'June–August' },
      { md: '12-20', period: 'September–November' },
      { md: '03-20', period: 'December–February' },
    ]
  }
  const quarters = [
    { month: 4, period: 'January–March' },
    { month: 7, period: 'April–June' },
    { month: 10, period: 'July–September' },
    { month: 1, period: 'October–December' },
  ]
  return quarters.map(({ month, period }) => {
    const day = rule.kind === 'day' ? rule.day : rule.kind === 'last' ? lastDay(month) : 30
    return { md: `${pad(month)}-${pad(day)}`, period }
  })
}

/** The next date (YYYY-MM-DD) a yearly MM-DD falls on, today included. */
export function nextYearly(md: string, today = new Date()) {
  const y = today.getFullYear()
  const todayKey = `${y}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const thisYear = `${y}-${md}`
  return thisYear >= todayKey ? thisYear : `${y + 1}-${md}`
}

/** "20th of the month after the quarter" etc., in plain words. */
export function salesRuleLabel(rule: SalesRule) {
  switch (rule.kind) {
    case 'day':
      return `due the ${rule.day}th of the month after each quarter`
    case 'last':
      return 'due the last day of the month after each quarter'
    case 'thirty':
      return 'due 30 days after each quarter ends'
    case 'ny':
      return 'quarters end in February, May, August and November; due the 20th after'
    default:
      return rule.why
  }
}
