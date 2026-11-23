// Describe database rows, API results and token fields for TypeScript.
// Describe a department choice: ID, code and optional description.
export interface Department {
    depsno: number;
    depdep: string;
    depdes: string | null;
}
// Describe a location choice: ID, code and optional name.
export interface Location {
    locsno: number;
    locloc: string;
    locnam: string | null;
}
// Describe a coded lookup item, such as a section or cost centre.
export interface SysItem {
    syssno: number;
    sysrtp: number;
    sysrno: string;
    sysdes: string;
}
// Group the dropdown lists returned by the lookup API.
export interface Lookups {
    locations: Location[];
    departments: Department[];
    sections: SysItem[];
    costCenters: SysItem[];
    basis: SysItem[];
    areas: SysItem[];
}
// Describe a complete employee record using its database field names.
export interface Employee {
    empsno: number;
    empeno: number;
    empinital: string;
    empnam: string;
    empcat: string;
    empactflg: string;
    empsts: string;
    empmapcode: number | null;
    emplocsno: number | null;
    empdepsno: number | null;
    empsecsno: number | null;
    emparesno: number | null;
    empcossno: number | null;
    empbasisno: number | null;
    department_name?: string | null;
    location_name?: string | null;
    empsal: number;
    empscgpcn: number;
    empepfyn: string;
    empepfno: number;
    emppayeyn: string;
    emptno: number;
    empprl: number;
    emptax: number;
    empgin: number;
    emptin: string;
    empcob: number;
    empmof: string;
    empidno: string;
    emppasportno: string;
    empdob: string | null;
    empmrdtst: string;
    empdesig: string;
    empjoin: string | null;
    empleft: string | null;
    empbnkacno: string;
    empbnkcode: string;
    empbnkbranch: string;
    empbnkid: string;
    empad1: string;
    empad2: string;
    empad3: string;
    empad4: string;
    empemail: string;
    emptel: string;
    empanual: string;
    empcasal: string;
    empleuleu: string;
    empotflg: string;
    empnopflg: string;
    empattincflg: string;
    emplateflg: string;
    empnsatlflg: string;
}
// Describe one results page, its record count and page totals.
export interface Paged<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
// Describe public signed-in user details returned to the browser.
export interface AuthUser {
    id: number;
    username: string;
    name: string;
    role: string;
}
/** what we store inside the login token */
// Describe user identity and expiry fields inside a signed token.
export interface TokenPayload {
    sub: number;
    usr: string;
    name: string;
    exp: number;
}
// Describe one chart label and its numeric value.
export interface ChartItem {
    label: string | number;
    value: number;
}
// Describe totals, chart groups and recent employee rows.
export interface DashboardData {
    totals: {
        total: number;
        active: number;
        inactive: number;
        payroll: number;
        avgSalary: number;
        joinedThisYear: number;
    };
    byCategory: ChartItem[];
    byGender: ChartItem[];
    byDepartment: ChartItem[];
    byLocation: ChartItem[];
    payrollByDepartment: ChartItem[];
    joinsByYear: ChartItem[];
    recent: {
        empsno: number;
        empeno: number;
        empnam: string;
        empdesig: string;
        department_name: string | null;
        empjoin: string | null;
    }[];
}
/** employee fields that can be sent when creating / updating */
// Allow writable employee fields after backend validation.
export type EmployeeInput = Partial<Omit<Employee, 'empsno' | 'department_name' | 'location_name'>>;
// Describe a database account row, including its stored password hash.
export interface UserRow {
    usdsno: number;
    usdusd: string;
    usdpwd: string;
    usdnam: string | null;
    usddes: string | null;
    usdactive: string;
}
