const fs = require('fs');
const file = 'd:/Office Projects/Zudo-admin panel/src/pages/Orders.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `          <div class="signatures">
            <div class="signature-box" style="margin-top: 10px;">Security Verification</div>
            <div class="signature-box" style="margin-top: 10px;">Logistics Handover</div>
            <div class="signature-box" style="margin-top: 10px;">Consignee Stamp/Sign</div>
          </div>`;

const replaceStr = `          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
            \${(() => {
              const orderSeller = order.sellerId || (order.items && order.items[0] && order.items[0].seller && order.items[0].seller.sellerId);
              const qrCodeDoc = orderSeller?.qrCodeDoc;
              const qrOption = orderSeller?.qrOption;
              return qrCodeDoc ? \`
                <div style="display: flex; gap: 8px; align-items: center; border: 1px solid #e2e8f0; padding: 4px; border-radius: 6px;">
                  <img src="\${getImageUrl(qrCodeDoc)}" alt="QR" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" />
                  <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">Scan to Pay</span>
                    <span style="font-size: 10px; font-weight: 700; color: #0f172a;">\${qrOption || 'N/A'}</span>
                  </div>
                </div>
              \` : \`
                <div style="font-size: 9px; color: #64748b; font-weight: 600; padding-bottom: 4px;">QR Code Not Available</div>
              \`;
            })()}
            <div class="signatures" style="margin-top: 0; width: auto; flex: 1; display: flex; justify-content: flex-end; gap: 10px;">
              <div class="signature-box" style="margin-top: 0; min-width: 80px;">Security Verification</div>
              <div class="signature-box" style="margin-top: 0; min-width: 80px;">Logistics Handover</div>
              <div class="signature-box" style="margin-top: 0; min-width: 80px;">Consignee Stamp/Sign</div>
            </div>
          </div>`;

if(content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log('Successfully updated Admin Orders.jsx printManifest');
} else {
  console.log('Target string not found in Admin Orders.jsx');
}
