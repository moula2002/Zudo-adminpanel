const fs = require('fs');
const file = 'd:/Office Projects/Zudo-admin panel/src/pages/Invoices.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<span>Preview & Generate All \(\{filteredOrders\.length\}\)<\/span>[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  `<span>Preview & Generate All ({filteredOrders.length})</span>
            </button>
            <button 
              className="btn-primary flex items-center gap-2"
              onClick={() => handleDirectBulkPrint(filteredOrders)}
              disabled={filteredOrders.length === 0 || invoiceType === 'seller_generated'}
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', opacity: invoiceType === 'seller_generated' ? 0.5 : 1 }}
            >
              <Printer size={18} />
              <span>Bulk Print Page ({filteredOrders.length})</span>
            </button>
          </div>
        </div>`
);

content = content.replace(
  /<div style=\{\{ fontSize: '11px', color: 'var\(--text-dim\)', marginTop: '4px' \}\}>\{order\.userId\?\.role\?\.toUpperCase\(\) \|\| 'B2C'\}<\/div>\s*<\/td>/g,
  `<div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {order.userId?.role?.toUpperCase() || 'B2C'}
                        {order.isPrinted && <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>Printed</span>}
                      </div>
                    </td>`
);

fs.writeFileSync(file, content);
