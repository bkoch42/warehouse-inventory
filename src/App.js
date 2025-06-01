import React, { useState, useEffect, useRef } from 'react';
import { Package, Scan, Plus, Minus, Building2, Users, FileSpreadsheet, Camera, X } from 'lucide-react';//Download, Edit

const WarehouseInventoryApp = () => {
  const [currentUser, setCurrentUser] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState({
    'Main Warehouse': {}
  });
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');

  const userRoles = ['PM', 'GM', 'Chop Driver', 'Lead Installer'];
  const availableColors = [
    'White', 'Brown', 'Coal Gray', 'Musket Brown', 'Eggshell', 'Wicker',
    'Cream', 'Clay', 'Tan', 'Terratone', 'Ivory', 'Light Gray', 'Red', 'Green'
  ];

  const [scannedCode, setScannedCode] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCheckInOut, setShowCheckInOut] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [transactionType, setTransactionType] = useState('');
  const [quantity, setQuantity] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load data from memory on component mount
  useEffect(() => {
    const savedData = window.warehouseData || {};
    const savedCurrentUser = window.currentWarehouseUser || '';
    const savedSelectedWarehouse = window.selectedWarehouse || '';

    if (Object.keys(savedData).length > 0) {
      setWarehouses(savedData);
    } else {
      // Initialize with sample data only if no saved data exists
      const sampleData = {
        'Main Warehouse': {
          'QR001': {
            itemNumber: 'SKU-001',
            description: 'Red Vinyl Siding',
            quantity: 50,
            color: 'Red',
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: 'PM'
          },
          'QR002': {
            itemNumber: 'SKU-002',
            description: 'Clay Vinyl Siding',
            quantity: 25,
            color: 'Clay',
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: 'GM'
          }
        }
      };
      setWarehouses(sampleData);
      window.warehouseData = sampleData;
    }

    if (savedCurrentUser) {
      setCurrentUser(savedCurrentUser);
    }
    if (savedSelectedWarehouse) {
      setSelectedWarehouse(savedSelectedWarehouse);
    }
  }, []);

  // Save data to memory whenever warehouses data changes
  useEffect(() => {
    window.warehouseData = warehouses;
  }, [warehouses]);

  // Save current user when it changes
  useEffect(() => {
    window.currentWarehouseUser = currentUser;
  }, [currentUser]);

  // Save selected warehouse when it changes
  useEffect(() => {
    window.selectedWarehouse = selectedWarehouse;
  }, [selectedWarehouse]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowQRScanner(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please ensure you have given camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowQRScanner(false);
  };

  const captureAndScan = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // In a real implementation, you would use a QR code library here
      // For now, we'll prompt the user to enter the QR code they see
      const qrCode = prompt('Please enter the QR code you scanned:');
      if (qrCode) {
        handleQRScan(qrCode);
        stopCamera();
      }
    }
  };

  const handleQRScan = (code) => {
    setScannedCode(code);
    const item = warehouses[selectedWarehouse]?.[code];
    
    if (item) {
      setCurrentItem({ ...item, qrCode: code });
      setShowCheckInOut(true);
    } else {
      // Check if item exists in other warehouses
      const itemFromOtherWarehouse = findItemInOtherWarehouses(code);
      if (itemFromOtherWarehouse) {
        setCurrentItem({ ...itemFromOtherWarehouse, qrCode: code, quantity: 0 });
      } else {
        setCurrentItem({ qrCode: code, itemNumber: '', description: '', quantity: 0, color: '' });
      }
      setShowItemForm(true);
    }
  };

  const findItemInOtherWarehouses = (qrCode) => {
    for (const [warehouseName, warehouseItems] of Object.entries(warehouses)) {
      if (warehouseName !== selectedWarehouse && warehouseItems[qrCode]) {
        return warehouseItems[qrCode];
      }
    }
    return null;
  };

  const handleItemSubmit = (itemData) => {
    const updatedWarehouses = { ...warehouses };
    if (!updatedWarehouses[selectedWarehouse]) {
      updatedWarehouses[selectedWarehouse] = {};
    }
    updatedWarehouses[selectedWarehouse][scannedCode] = {
      ...itemData,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: currentUser
    };
    setWarehouses(updatedWarehouses);
    setShowItemForm(false);
    setCurrentItem(null);
  };

  const handleCheckInOut = (type, qty) => {
    const updatedWarehouses = { ...warehouses };
    const currentQty = currentItem.quantity;
    const newQty = type === 'in' ? currentQty + parseInt(qty) : currentQty - parseInt(qty);

    updatedWarehouses[selectedWarehouse][scannedCode] = {
      ...currentItem,
      quantity: Math.max(0, newQty),
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: currentUser
    };

    setWarehouses(updatedWarehouses);
    setShowCheckInOut(false);
    setCurrentItem(null);
    setQuantity('');
  };

  const addWarehouse = () => {
    if (newWarehouseName && !warehouses[newWarehouseName]) {
      const updatedWarehouses = { ...warehouses };
      updatedWarehouses[newWarehouseName] = {};
      setWarehouses(updatedWarehouses);
      setNewWarehouseName('');
      setShowAddWarehouse(false);
    }
  };

  const exportToExcel = () => {
    // Group items by color across all warehouses
    const allItems = {};
    
    Object.entries(warehouses).forEach(([warehouseName, items]) => {
      Object.entries(items).forEach(([qrCode, item]) => {
        const key = `${item.itemNumber}-${item.color}`;
        if (!allItems[key]) {
          allItems[key] = {
            itemNumber: item.itemNumber,
            description: item.description,
            color: item.color,
            totalQuantity: 0,
            warehouses: {}
          };
        }
        allItems[key].totalQuantity += item.quantity;
        allItems[key].warehouses[warehouseName] = item.quantity;
      });
    });

    // Create CSV content
    let csvContent = 'Item Number,Description,Color,Total Quantity,';
    csvContent += Object.keys(warehouses).join(',') + '\n';

    Object.values(allItems).forEach(item => {
      csvContent += `${item.itemNumber},${item.description},${item.color},${item.totalQuantity},`;
      csvContent += Object.keys(warehouses).map(w => item.warehouses[w] || 0).join(',') + '\n';
    });

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <Package className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Manager</h1>
            <p className="text-gray-600">Select your role to continue</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
            >
              <option value="">Select your role</option>
              {userRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => currentUser && setCurrentUser(currentUser)}
            disabled={!currentUser}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!selectedWarehouse) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Select Warehouse</h1>
                  <p className="text-gray-600">Welcome, {currentUser}</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentUser('')}
                className="text-gray-500 hover:text-gray-700"
              >
                <Users className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {Object.keys(warehouses).map((warehouse) => (
                <button
                  key={warehouse}
                  onClick={() => setSelectedWarehouse(warehouse)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">{warehouse}</h3>
                  <p className="text-sm text-gray-500">
                    {Object.keys(warehouses[warehouse]).length} items
                  </p>
                </button>
              ))}
              
              <button
                onClick={() => setShowAddWarehouse(true)}
                className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center"
              >
                <Plus className="h-12 w-12 text-gray-400 mb-2" />
                <h3 className="font-semibold text-gray-600">Add Warehouse</h3>
              </button>
            </div>
          </div>
        </div>
        
        {/* Add Warehouse Modal */}
        {showAddWarehouse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Warehouse</h3>
              <input
                type="text"
                placeholder="Warehouse name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={addWarehouse}
                  disabled={!newWarehouseName}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Warehouse
                </button>
                <button
                  onClick={() => {setShowAddWarehouse(false); setNewWarehouseName('');}}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSelectedWarehouse('')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700"
              >
                <Building2 className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedWarehouse}</h1>
                <p className="text-sm text-gray-600">User: {currentUser}</p>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* QR Scanner */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <div className="text-center mb-4">
            <Scan className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Scan QR Code</h2>
            <p className="text-gray-600 mb-4">Use your device camera to scan QR codes</p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startCamera}
              className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              <Camera className="h-5 w-5 mr-2" />
              Start Camera Scanner
            </button>
            
            {/* Demo QR codes */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Demo QR codes to try:</p>
              <div className="flex flex-wrap gap-2">
                {['QR001', 'QR002', 'QR003'].map(code => (
                  <button
                    key={code}
                    onClick={() => handleQRScan(code)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Manual QR input */}
            <div className="flex gap-2 w-full max-w-md">
              <input
                type="text"
                placeholder="Or enter QR code manually"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
              />
              <button
                onClick={() => handleQRScan(scannedCode)}
                disabled={!scannedCode}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Scan
              </button>
            </div>
          </div>
        </div>

        {/* Current Inventory */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Inventory</h2>
          {Object.keys(warehouses[selectedWarehouse]).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in this warehouse yet. Start by scanning a QR code!</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(warehouses[selectedWarehouse]).map(([qrCode, item]) => (
                <div key={qrCode} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">{qrCode}</span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{item.itemNumber}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{item.color}</span>
                    </div>
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-600">
                        Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                      </p>
                      {item.lastUpdatedBy && (
                        <p className="text-sm text-gray-600">by {item.lastUpdatedBy}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{item.quantity}</p>
                    <p className="text-xs text-gray-500">in stock</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="text-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-sm mx-auto mb-4 rounded-lg"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button
                onClick={captureAndScan}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Capture & Scan
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Point your camera at a QR code and click "Capture & Scan"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {currentItem?.itemNumber ? 'Add Existing Item' : 'New Item'}
            </h3>
            <ItemForm
              initialData={currentItem}
              availableColors={availableColors}
              onSubmit={handleItemSubmit}
              onCancel={() => setShowItemForm(false)}
            />
          </div>
        </div>
      )}

      {/* Check In/Out Modal */}
      {showCheckInOut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentItem?.description}</h3>
            <p className="text-gray-600 mb-4">Current quantity: {currentItem?.quantity}</p>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTransactionType('in')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center ${
                  transactionType === 'in' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Check In
              </button>
              <button
                onClick={() => setTransactionType('out')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center ${
                  transactionType === 'out' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Minus className="h-4 w-4 mr-2" />
                Check Out
              </button>
            </div>
            
            {transactionType && (
              <div className="space-y-4">
                <input
                  type="number"
                  placeholder="Quantity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckInOut(transactionType, quantity)}
                    disabled={!quantity || parseInt(quantity) <= 0}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowCheckInOut(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ItemForm = ({ initialData, onSubmit, onCancel, availableColors }) => {
  const [formData, setFormData] = useState({
    itemNumber: initialData?.itemNumber || '',
    description: initialData?.description || '',
    quantity: initialData?.quantity || 0,
    color: initialData?.color || ''
  });

  const handleSubmit = () => {
    if (formData.itemNumber && formData.description && formData.color) {
      onSubmit(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Item Number</label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={formData.itemNumber}
          onChange={(e) => setFormData({...formData, itemNumber: e.target.value})}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
        <input
          type="number"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={formData.quantity}
          onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <select
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={formData.color}
          onChange={(e) => setFormData({...formData, color: e.target.value})}
        >
          <option value="">Select color</option>
          {availableColors.map(color => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
      </div>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Save Item
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WarehouseInventoryApp;