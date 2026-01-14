import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Float, Stars, Cylinder, Box as Box3D } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  ResponsiveContainer, Tooltip, ReferenceLine, Cell, Legend, CartesianGrid 
} from 'recharts';
import { Zap, Clock, FlaskConical, Layers, BarChart3, Atom, Box, Cpu, Lightbulb } from 'lucide-react';
import * as THREE from 'three';

// 引入物理引擎
// ⚠️ 请确保你的 physics.js 已经是更新过的版本，包含了蓝移和猝灭逻辑
import { 
  calculateEmissionParams, 
  generateCompositeSpectrum, 
  calculateColorFromSpectrum, 
  getBlueLEDSpectrum, 
  calculateCRI, 
  getLatticeStructure 
} from './utils/physics';

// --- 3D 辅助组件: 化学键 ---
const ChemicalBond = ({ start, end }) => {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const distance = startVec.distanceTo(endVec);
  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  
  const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh position={midPoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.02, 0.02, distance, 8]} />
      <meshStandardMaterial color="#666" opacity={0.4} transparent />
    </mesh>
  );
};

// --- 3D 组件: 晶体结构渲染器 ---
const CrystalStructure = ({ mode, zrDoping, isCoreShell }) => {
  const { atoms, bonds } = useMemo(() => getLatticeStructure(mode, zrDoping), [mode, zrDoping]);

  return (
    <group>
      {/* 原子 */}
      {atoms.map((atom, i) => (
        <mesh key={`atom-${i}`} position={atom.pos}>
          <sphereGeometry args={[atom.radius, 32, 32]} />
          <meshPhysicalMaterial 
            color={atom.color} 
            roughness={0.2} 
            metalness={0.5} 
            emissive={atom.type === 'Zr' ? '#3b82f6' : '#000'} 
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      {/* 化学键 */}
      {bonds.map((bond, i) => (
        <ChemicalBond key={`bond-${i}`} start={bond.start} end={bond.end} />
      ))}

      {/* 壳层暗示 (仅Cluster模式) */}
      {isCoreShell && mode === 'cluster' && (
        <mesh position={[0, 0, 0]}>
           <sphereGeometry args={[2.5, 64, 64]} />
           <meshPhysicalMaterial 
             color="#e0f2fe" 
             transparent 
             opacity={0.15} 
             roughness={0.1}
             metalness={0.1}
             transmission={0.8}
             side={THREE.DoubleSide}
           />
        </mesh>
      )}
    </group>
  );
};

// --- 3D 组件: 宏观量子点球体 ---
const QuantumDotSphere = ({ radius, color, isCoreShell }) => (
  <group>
    <Sphere args={[radius * 0.35, 128, 128]}>
      <meshPhysicalMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={isCoreShell ? 2.5 : 1.5}
        roughness={0.1}
        metalness={0.1}
        transmission={0.6} 
        thickness={radius} 
      />
    </Sphere>

    {isCoreShell && (
      <Sphere args={[radius * 0.35 + 0.6, 64, 64]}>
        <meshPhysicalMaterial 
          color="#e0f2fe" 
          transparent 
          opacity={0.2} 
          roughness={0}
          metalness={0.1}
          transmission={0.9} 
          thickness={0.2}
          side={THREE.DoubleSide}
        />
      </Sphere>
    )}
  </group>
);

// --- 3D 组件: Remote 封装器件视图 (论文第四章核心工艺) ---
const RemoteDeviceView = ({ color }) => {
  return (
    <group rotation={[0.3, 0, 0]}>
      {/* 1. 底部：蓝光 LED 芯片 (Base) */}
      <mesh position={[0, -1.8, 0]}>
        <boxGeometry args={[3, 0.2, 3]} />
        <meshStandardMaterial color="#222" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* 芯片本体 */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshBasicMaterial color="#0000ff" toneMapped={false} /> 
      </mesh>
      {/* 芯片发出的强蓝光 */}
      <pointLight position={[0, -1.5, 0]} distance={4} intensity={8} color="#0000ff" decay={2} />

      {/* 2. 中间：Remote 硅胶隔离层 (透明) - 对应论文 "隔离LED芯片与荧光材料" */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 1.4, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transmission={0.95} 
          roughness={0.1} 
          thickness={1.5} 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 标注环 */}
      <mesh position={[0, -0.8, 0]}>
         <torusGeometry args={[1.5, 0.02, 16, 100]} />
         <meshBasicMaterial color="#555" transparent opacity={0.5} />
      </mesh>

      {/* 3. 顶部：AgGaS2/ZnS 量子点转换膜 (发光层) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
        <meshPhysicalMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={3}
          transparent
          opacity={0.9}
          roughness={0.4}
        />
      </mesh>
      
      {/* 模拟发出的混合白光 */}
      <pointLight position={[0, 2, 0]} distance={10} intensity={3} color="#ffffff" decay={2} />
    </group>
  );
};

// --- 主程序 ---
const App = () => {
  // 状态管理
  const [viewMode, setViewMode] = useState('device'); // 默认展示 'device' 因为这是应用层面的亮点
  const [showComparison, setShowComparison] = useState(true); // 默认开启对比

  // 物理参数
  const [radius, setRadius] = useState(3.5);     
  const [fwhm, setFwhm] = useState(35);          
  const [reactionTime, setReactionTime] = useState(30); 
  const [zrDoping, setZrDoping] = useState(0);   
  const [isCoreShell, setIsCoreShell] = useState(true); // 默认开启核壳，效果更好

  // 计算管线
  const { spectrum, centerWl, energy, sphereColor, criScore } = useMemo(() => {
    // ⚠️ 这里的逻辑依赖 physics.js 的更新
    const { wl: baseWl, energy: eGap } = calculateEmissionParams(radius, reactionTime, isCoreShell);
    const qdSpec = generateCompositeSpectrum(baseWl, fwhm, zrDoping);
    const blue = getBlueLEDSpectrum();
    const qdIntensityFactor = Math.max(0.2, 1 - zrDoping * 2); 
    
    const mixed = qdSpec.map((p, i) => ({ 
      wl: p.wl, 
      intensity: (p.intensity * qdIntensityFactor) + (blue[i] ? blue[i].intensity * 0.4 : 0)
    }));

    const qdColor = calculateColorFromSpectrum(qdSpec);
    const cri = calculateCRI(mixed); 

    return { 
      spectrum: mixed, 
      centerWl: baseWl, 
      energy: eGap, 
      sphereColor: qdColor.hex, 
      criScore: cri
    };
  }, [radius, fwhm, reactionTime, zrDoping, isCoreShell]);

  // 论文数据：CRI 对比 (Table 4-3 & 4-4)
  const criChartData = [
    { name: 'R1', trad: 53.8, qd: 58.7 },
    { name: 'R2', trad: 63.8, qd: 79.9 }, // 显著提升
    { name: 'R3', trad: 76.9, qd: 89.6 }, // 黄绿区显著提升
    { name: 'R4', trad: 63.6, qd: 53.5 },
    { name: 'R9', trad: -77.7, qd: -77.2 }, // 红色依然不足（真实数据，体现诚实）
    { name: 'Ra', trad: 61.5, qd: 66.2 }, // 平均值提升
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#000', color: '#e5e5e5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 左侧控制面板 */}
      <div style={{ width: '420px', padding: '24px', background: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
          <div style={{ background: '#222', padding:'8px', borderRadius:'8px' }}>
            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
          </div>
          <div>
             <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>AgGaS₂ Digital Twin</h1>
             <span style={{ fontSize: '11px', color: '#666', letterSpacing:'0.5px' }}>AI4S • Physics Simulation</span>
          </div>
        </div>

        {/* 1. 结构控制 */}
        <div className="control-group">
          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
             <Layers size={14} color="#888"/>
             <span style={{fontSize:'12px', fontWeight:'600', color:'#888', textTransform:'uppercase'}}>Structure Synthesis</span>
          </div>

          <div 
             onClick={() => setIsCoreShell(!isCoreShell)}
             style={{ 
               display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
               padding: '12px', background: '#111', borderRadius: '8px', 
               cursor: 'pointer', border: isCoreShell ? '1px solid #3b82f6' : '1px solid #222',
               marginBottom: '10px'
             }}
          >
             <div style={{display:'flex', flexDirection:'column'}}>
                <span style={{fontSize:'13px', color:'#fff'}}>Core-Shell Growth (ZnS)</span>
                <span style={{fontSize:'10px', color:'#555'}}>Enhance Stability & Intensity</span>
             </div>
             <div style={{ width: '36px', height: '20px', background: isCoreShell ? '#3b82f6' : '#333', borderRadius: '12px', position: 'relative', transition:'0.3s' }}>
                <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isCoreShell ? '18px' : '2px', transition:'0.3s' }} />
             </div>
          </div>

          <div style={{ background: '#111', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
              <span style={{fontSize:'12px', color:'#ccc', display:'flex', alignItems:'center', gap:'6px'}}><Clock size={12}/> Reaction Time</span>
              <span style={{fontSize:'12px', color:'#3b82f6'}}>{reactionTime} min</span>
            </div>
            <input 
              type="range" min="30" max="90" step="5" 
              value={reactionTime} onChange={e => setReactionTime(parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#3b82f6', height:'4px' }} 
            />
             <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px'}}>
              <span style={{fontSize:'10px', color:'#444'}}>30 min (570nm)</span>
              <span style={{fontSize:'10px', color:'#ef4444'}}>Anomalous Blue Shift</span>
              <span style={{fontSize:'10px', color:'#444'}}>90 min (520nm)</span>
            </div>
          </div>
        </div>

        {/* 2. 掺杂控制 */}
        <div className="control-group">
          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
             <FlaskConical size={14} color="#888"/>
             <span style={{fontSize:'12px', fontWeight:'600', color:'#888', textTransform:'uppercase'}}>Ion Doping (Zr⁴⁺)</span>
          </div>
          
          <div style={{ background: '#111', padding: '12px', borderRadius: '8px' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
              <span style={{fontSize:'12px', color:'#ccc'}}>Doping Concentration</span>
              <span style={{fontSize:'12px', color: zrDoping > 0 ? '#60a5fa' : '#666'}}>{zrDoping} mmol</span>
            </div>
            <input 
              type="range" min="0" max="0.3" step="0.01" 
              value={zrDoping} onChange={e => setZrDoping(parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#60a5fa', height:'4px' }} 
            />
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px'}}>
              <span style={{fontSize:'10px', color:'#444'}}>Pure AGS</span>
              <span style={{fontSize:'10px', color:'#444'}}>Energy Transfer</span>
              <span style={{fontSize:'10px', color:'#444'}}>Quenching (0.3)</span>
            </div>
          </div>
        </div>

        {/* 3. 数据图表 - 光谱分析 */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
           <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
             <BarChart3 size={14} color="#888"/>
             <span style={{fontSize:'12px', fontWeight:'600', color:'#888'}}>SPECTRAL ANALYSIS</span>
           </div>

           <div style={{ height: '140px', background: '#111', padding: '10px', borderRadius: '8px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={spectrum}>
                 <defs>
                    <linearGradient id="colorQd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sphereColor} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={sphereColor} stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <Area type="monotone" dataKey="intensity" stroke={sphereColor} fill="url(#colorQd)" strokeWidth={2} />
                 {showComparison && <ReferenceLine x={564} stroke="#fbbf24" strokeDasharray="3 3" label={{position: 'top', value: 'Trad.', fill:'#fbbf24', fontSize:10}} />}
                 <XAxis dataKey="wl" tick={{fontSize:10}} interval={50} stroke="#444" />
                 <YAxis hide />
                 <Tooltip contentStyle={{background:'#000', border:'1px solid #333', fontSize:'12px'}} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 4. 数据图表 - CRI 对比 (专业数据展示) */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'10px' }}>
           <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
             <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
               <Lightbulb size={14} color="#888"/>
               <span style={{fontSize:'12px', fontWeight:'600', color:'#888'}}>CRI COMPARISON (Data)</span>
             </div>
             <button onClick={() => setShowComparison(!showComparison)} style={{background:'none', border:'none', color:'#3b82f6', fontSize:'10px', cursor:'pointer'}}>
                {showComparison ? 'Hide' : 'Show'} Comparison
             </button>
           </div>

           {showComparison && (
             <div style={{ height: '140px', background: '#111', padding: '10px', borderRadius: '8px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={criChartData} barGap={2}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222"/>
                   <XAxis dataKey="name" tick={{fontSize:10, fill:'#666'}} stroke="#444" />
                   <YAxis tick={{fontSize:10, fill:'#666'}} stroke="#444" domain={[-80, 100]} hide />
                   <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background:'#000', border:'1px solid #333', fontSize:'11px'}}/>
                   <Legend iconSize={8} wrapperStyle={{fontSize:'10px', paddingTop:'5px'}}/>
                   <Bar dataKey="trad" name="Traditional (YAG)" fill="#555" radius={[2, 2, 0, 0]} />
                   <Bar dataKey="qd" name="AgGaS2/ZnS" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           )}
        </div>
        
        {/* 导出脚本按钮 (呼应自动化实验) */}
        <div style={{ marginTop: 'auto', paddingTop:'20px' }}>
           <button style={{ 
             width:'100%', padding:'10px', background:'#222', border:'1px solid #333', color:'#888', 
             borderRadius:'6px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
           }} onClick={() => alert("Simulating export to Python script for robot automation...")}>
              <Cpu size={14}/> Export Experiment Recipe (JSON)
           </button>
        </div>

      </div>

      {/* 右侧 3D 视图 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <button onClick={() => setViewMode('device')} style={{ padding: '6px 12px', background: viewMode==='device'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='device'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Box size={12}/> Remote Device
            </button>
            <button onClick={() => setViewMode('cluster')} style={{ padding: '6px 12px', background: viewMode==='cluster'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='cluster'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Atom size={12}/> Nanocrystal
            </button>
            <button onClick={() => setViewMode('unit')} style={{ padding: '6px 12px', background: viewMode==='unit'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='unit'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Layers size={12}/> Unit Cell
            </button>
        </div>

        <Canvas camera={{ position: [0, 2, 8] }}>
          <color attach="background" args={['#050505']} />
          <Stars depth={50} count={2000} factor={4} fade />
          
          <ambientLight intensity={isCoreShell ? 0.4 : 0.2} />
          {/* 针对不同视图调整光照 */}
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -5, -5]} intensity={0.5} color={sphereColor} />
          
          <Float speed={viewMode === 'device' ? 0 : 2} rotationIntensity={viewMode === 'device' ? 0 : 0.2} floatIntensity={0.5}>
             {viewMode === 'dot' ? 
                <QuantumDotSphere radius={radius} color={sphereColor} isCoreShell={isCoreShell} /> : 
              viewMode === 'device' ?
                <RemoteDeviceView color={sphereColor} /> :
                <CrystalStructure mode={viewMode} zrDoping={zrDoping} isCoreShell={isCoreShell} />
             }
          </Float>

          <EffectComposer>
            <Bloom luminanceThreshold={0.2} intensity={isCoreShell ? 1.5 : 0.8} radius={0.5} />
          </EffectComposer>
          <OrbitControls enableZoom={true} minDistance={2} maxDistance={15} />
        </Canvas>
        
        <div style={{ position: 'absolute', bottom: '30px', right: '40px', textAlign: 'right', pointerEvents:'none' }}>
           <h1 style={{ margin:0, color: '#fff', opacity: 0.1, fontSize: '80px', lineHeight:'0.8', fontWeight:'800' }}>
             {centerWl.toFixed(0)}
           </h1>
           <div style={{ color: sphereColor, fontSize:'14px', letterSpacing:'2px', opacity:0.8 }}>PEAK WAVELENGTH (nm)</div>
           <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginTop:'10px' }}>
              {isCoreShell && <span style={{ color: '#fff', fontSize:'10px', opacity:0.5, background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px', alignSelf:'flex-end' }}>CORE-SHELL ENHANCED</span>}
              {zrDoping > 0 && <span style={{ color: '#3b82f6', fontSize:'10px', opacity:0.8, background:'rgba(59, 130, 246, 0.15)', padding:'2px 6px', borderRadius:'4px', alignSelf:'flex-end' }}>Zr⁴⁺ DOPED ({zrDoping} mmol)</span>}
              {reactionTime > 60 && <span style={{ color: '#fbbf24', fontSize:'10px', opacity:0.8, background:'rgba(251, 191, 36, 0.15)', padding:'2px 6px', borderRadius:'4px', alignSelf:'flex-end' }}>BLUE SHIFT DETECTED</span>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;