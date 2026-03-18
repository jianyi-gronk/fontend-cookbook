import React from 'react';
import VirtualList1 from './components/virtualList1';
import VirtualList2 from './components/virtualList2';
import './App.css';

function App() {
  return (
    <div className="container">
      <div>
        {/* 元素高度固定的虚拟列表 */}
        <VirtualList1 />
      </div>
      <div style={{ marginLeft: 20 }}>
        {/* 元素高度不固定的虚拟列表 */}
        <VirtualList2 />
      </div>
    </div>
  );
}

export default App;
