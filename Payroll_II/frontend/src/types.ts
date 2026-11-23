export interface Department {
    depsno: number;
    depdep: string;
    depdes: string | null;
}
export interface Location {
    locsno: number;
    locloc: string;
    locnam: string | null;
}
export interface SysItem {
    syssno: number;
    sysrtp: number;
    sysrno: string;
    sysdes: string;
}
export interface Lookups {
    locations: Location[];
    departments: Department[];
    sections: SysItem[];
    costCenters: SysItem[];
    basis: SysItem[];
    areas: SysItem[];
}
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
export interface Paged<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
// Rights of the signed-in user on each screen (from the program rights in the database)
export type Rights = { view: boolean; add: boolean; amend: boolean; delete: boolean };
// Use the same program key registered for any current or future page.
export type Screen = string;
export type Access = { admin: boolean } & Record<Screen, Rights>;

export interface AuthUser {
    access?: Access;
    id: number;
    username: string;
    name: string;
    role: string;
}
export interface ChartItem {
    label: string | number;
    value: number;
}
export interface DashboardData {
    asOf: string;
    totals: {
        total: number;
        active: number;
        inactive: number;
        unknownStatus: number;
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
/** what the router gives every page */
export interface PageContext {
    params: string[];
    navigate: (path: string, replace?: boolean) => void;
    /** false when the user already moved to another page (ignore late API answers) */
    alive: () => boolean;
}
export interface PageModule {
    render: (el: HTMLElement, ctx: PageContext) => Promise<void>;
}
/** form values / API body for an employee (all fields optional) */
export type EmployeeBody = Partial<Omit<Employee, 'empsno' | 'department_name' | 'location_name'>>;
