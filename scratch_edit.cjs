const fs = require('fs');
const file = 'd:/Office Projects/Zudo-admin panel/src/pages/Invoices.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [cityFilter, setCityFilter] = useState(\'All\');',
  'const [cityFilter, setCityFilter] = useState(\'All\');\n  const [printStatusFilter, setPrintStatusFilter] = useState(\'All\');'
);

content = content.replace(
  'useEffect(() => {\n    applyFilters();\n  }, [invoiceType, segmentType, searchTerm, dateFilter, customDate, collation, cityFilter, orders]);',
  'useEffect(() => {\n    applyFilters();\n  }, [invoiceType, segmentType, searchTerm, dateFilter, customDate, collation, cityFilter, printStatusFilter, orders]);'
);

content = content.replace(
  '// City Filter',
  '// Print Status Filter\n    if (printStatusFilter === \'Printed\') {\n      result = result.filter(o => o.isPrinted);\n    } else if (printStatusFilter === \'Unprinted\') {\n      result = result.filter(o => !o.isPrinted);\n    }\n\n    // City Filter'
);

content = content.replace(
  'const handlePreview = (selectedOrders = filteredOrders) => {',
  `const handleDirectBulkPrint = async (selectedOrders = filteredOrders) => {
    if (selectedOrders.length === 0) return;
    if (iframeRef.current) {
      const html = generatePrintHTML(selectedOrders);
      const doc = iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      iframeRef.current.contentWindow.focus();
      setTimeout(() => {
        iframeRef.current.contentWindow.print();
        const orderIds = selectedOrders.map(o => o._id);
        api.post('/orders/bulk-print-status', { orderIds }).then(() => {
          toast.success('Orders marked as printed successfully');
          setOrders(prev => prev.map(o => orderIds.includes(o._id) ? { ...o, isPrinted: true } : o));
        }).catch(err => {
          console.error(err);
          toast.error('Failed to update print status on server');
        });
      }, 500);
    }
  };

  const handlePreview = (selectedOrders = filteredOrders) => {`
);

content = content.replace(
  "const generatePrintHTML = () => {\n    let pagesHtml = '';\n\n    const ordersToRender = collation === 'Collated' ? [{",
  "const generatePrintHTML = (ordersList = previewOrders) => {\n    let pagesHtml = '';\n\n    const ordersToRender = collation === 'Collated' ? [{"
);

content = content.replace(
  "items: previewOrders.flatMap(o => o.items.map((it, idx) => ({ ...it, parentOrderId: o._id, itemIndex: idx })))",
  "items: ordersList.flatMap(o => o.items.map((it, idx) => ({ ...it, parentOrderId: o._id, itemIndex: idx })))"
);

content = content.replace(
  "shippingAddress: previewOrders[0]?.shippingAddress,\n      userId: previewOrders[0]?.userId,\n      sellerId: previewOrders[0]?.sellerId,",
  "shippingAddress: ordersList[0]?.shippingAddress,\n      userId: ordersList[0]?.userId,\n      sellerId: ordersList[0]?.sellerId,"
);

content = content.replace(
  "}] : previewOrders;",
  "}] : ordersList;"
);

content = content.replace(
  "{availableCities.map(city => (\n                <option key={city} value={city}>{city === 'All' ? 'All Cities' : city}</option>\n              ))}\n            </select>\n          </div>",
  `{availableCities.map(city => (
                <option key={city} value={city}>{city === 'All' ? 'All Cities' : city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Print Status</label>
            <select className="input-field" value={printStatusFilter} onChange={e => setPrintStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Printed">Printed</option>
              <option value="Unprinted">Unprinted</option>
            </select>
          </div>`
);

content = content.replace(
  "<span>Preview & Generate All ({filteredOrders.length})</span>\n            </button>",
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
            </button>`
);

content = content.replace(
  "<div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{order.userId?.role?.toUpperCase() || 'B2C'}</div>\n                    </td>",
  `<div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {order.userId?.role?.toUpperCase() || 'B2C'}
                        {order.isPrinted && <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>Printed</span>}
                      </div>
                    </td>`
);

// Fallbacks if newline matching failed
content = content.replace(
  /const generatePrintHTML = \(\) => \{\s*let pagesHtml = '';\s*const ordersToRender = collation === 'Collated' \? \[\{/,
  "const generatePrintHTML = (ordersList = previewOrders) => {\n    let pagesHtml = '';\n\n    const ordersToRender = collation === 'Collated' ? [{"
);
content = content.replace(
  /shippingAddress: previewOrders\[0\]\?\.shippingAddress,\s*userId: previewOrders\[0\]\?\.userId,\s*sellerId: previewOrders\[0\]\?\.sellerId,/,
  "shippingAddress: ordersList[0]?.shippingAddress,\n      userId: ordersList[0]?.userId,\n      sellerId: ordersList[0]?.sellerId,"
);

fs.writeFileSync(file, content);
console.log("Replaced successfully!");
