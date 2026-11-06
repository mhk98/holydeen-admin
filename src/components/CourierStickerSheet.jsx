import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
// Official logos, inlined so they are already painted when the print dialog opens.
// Sources: https://pathao.com/logo.svg and the header logo of https://steadfast.com.bd
import pathaoLogo from "../assets/couriers/pathao.svg?raw";
import steadfastLogo from "../assets/couriers/steadfast.svg?raw";

const COURIER_LOGOS = {
  pathao: { svg: pathaoLogo, label: "Pathao" },
  steadfast: { svg: steadfastLogo, label: "Steadfast" },
};

// Thermal courier sticker: 3" x 2" (75mm x 50mm), one sticker per page.
// Rendered straight into <body> so printing can drop the whole app layout.
export default function CourierStickerSheet({ stickers, merchant }) {
  return createPortal(
    <div className="courier-sticker-print-area">
      {stickers.map((sticker) => (
        <CourierSticker key={sticker.id} sticker={sticker} merchant={merchant} />
      ))}

      <style>{`
        .courier-sticker-print-area {
          display: none;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .courier-sticker {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          width: 75mm;
          height: 50mm;
          padding: 2mm 2.5mm;
          border: 0.3mm solid #000;
          background: #fff;
          color: #000;
          font-family: Roboto, Arial, "Noto Sans Bengali", "Hind Siliguri", sans-serif;
          overflow: hidden;
          break-after: page;
          page-break-after: always;
        }

        .courier-sticker:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .courier-sticker p {
          margin: 0;
        }

        .courier-sticker__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2mm;
          padding-bottom: 1mm;
          border-bottom: 0.3mm solid #000;
        }

        .courier-sticker__logo {
          flex-shrink: 0;
          line-height: 0;
        }

        .courier-sticker__logo svg {
          display: block;
          width: auto;
          height: 6.5mm;
        }

        .courier-sticker__merchant {
          min-width: 0;
          text-align: right;
          line-height: 1.15;
        }

        .courier-sticker__merchant p {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .courier-sticker__merchant-name {
          font-size: 10px;
          font-weight: 700;
        }

        .courier-sticker__merchant-phone {
          font-size: 8.5px;
        }

        .courier-sticker__barcode {
          display: block;
          width: 100%;
          height: 9.5mm;
          margin-top: 1.2mm;
        }

        .courier-sticker__ids {
          display: flex;
          justify-content: space-between;
          gap: 2mm;
          margin-top: 0.5mm;
          font-size: 8.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .courier-sticker__body {
          display: flex;
          flex: 1;
          gap: 2mm;
          min-height: 0;
          margin-top: 1mm;
          padding-top: 1mm;
          border-top: 0.3mm dashed #000;
        }

        .courier-sticker__customer {
          flex: 1;
          min-width: 0;
          font-size: 9px;
          line-height: 1.2;
        }

        .courier-sticker__customer-name,
        .courier-sticker__customer-phone {
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .courier-sticker__customer-name {
          font-size: 10px;
        }

        .courier-sticker__address {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .courier-sticker__cod {
          flex-shrink: 0;
          align-self: center;
          min-width: 19mm;
          padding: 1mm 1.5mm;
          border-radius: 1mm;
          background: #000;
          color: #fff;
          text-align: center;
          line-height: 1.1;
        }

        .courier-sticker__cod-label {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .courier-sticker__cod-amount {
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .courier-sticker__foot {
          display: flex;
          justify-content: space-between;
          gap: 2mm;
          margin-top: 0.5mm;
          font-size: 8px;
          white-space: nowrap;
        }

        @media print {
          @page {
            size: 75mm 50mm;
            margin: 0;
          }

          html,
          body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body > *:not(.courier-sticker-print-area) {
            display: none !important;
          }

          .courier-sticker-print-area {
            display: block !important;
            background: #fff;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function CourierSticker({ sticker, merchant }) {
  const barcodeRef = useRef(null);
  const logo = COURIER_LOGOS[sticker.courier];

  useEffect(() => {
    if (!barcodeRef.current || !sticker.consignmentId) return;
    // Code128 so the courier's scanners can read the consignment ID.
    JsBarcode(barcodeRef.current, sticker.consignmentId, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 60,
      width: 2,
    });
    // Stretch to the sticker width instead of the barcode's natural pixel size.
    barcodeRef.current.setAttribute("preserveAspectRatio", "none");
    barcodeRef.current.removeAttribute("width");
    barcodeRef.current.removeAttribute("height");
  }, [sticker.consignmentId]);

  return (
    <div className="courier-sticker">
      <div className="courier-sticker__head">
        <span
          className="courier-sticker__logo"
          role="img"
          aria-label={logo.label}
          dangerouslySetInnerHTML={{ __html: logo.svg }}
        />
        <div className="courier-sticker__merchant">
          <p className="courier-sticker__merchant-name">{merchant.name}</p>
          {merchant.phone && (
            <p className="courier-sticker__merchant-phone">{merchant.phone}</p>
          )}
        </div>
      </div>

      <svg
        ref={barcodeRef}
        className="courier-sticker__barcode"
        aria-label={`Barcode ${sticker.consignmentId}`}
      />
      <div className="courier-sticker__ids">
        <span>CID: {sticker.consignmentId}</span>
        {sticker.trackingCode && sticker.trackingCode !== sticker.consignmentId && (
          <span>TRK: {sticker.trackingCode}</span>
        )}
      </div>

      <div className="courier-sticker__body">
        <div className="courier-sticker__customer">
          <p className="courier-sticker__customer-name">{sticker.customerName}</p>
          <p className="courier-sticker__customer-phone">{sticker.customerPhone}</p>
          <p className="courier-sticker__address">{sticker.address}</p>
        </div>
        <div className="courier-sticker__cod">
          <p className="courier-sticker__cod-label">COD</p>
          <p className="courier-sticker__cod-amount">
            ৳{Number(sticker.codAmount || 0).toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="courier-sticker__foot">
        <span>Invoice: {sticker.invoice}</span>
        {sticker.date && <span>{sticker.date}</span>}
      </div>
    </div>
  );
}
