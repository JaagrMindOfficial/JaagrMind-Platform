/**
 * Responsive grid row for KpiCard children.
 */
const KpiRow = ({ children, columns = 4, className = '' }) => (
    <div className={`kpi-row ${columns === 5 ? 'kpi-row--5' : ''} ${className}`.trim()} role="presentation">
        {children}
    </div>
);

export default KpiRow;
