import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Zap, Clock, FlaskConical, Layers, BarChart3, Atom, Box } from 'lucide-react';
import * as THREE from 'three';

// 引入修正后的函数名 getLatticeStructure
import { 
  calculateEmissionParams, 
  generateCompositeSpectrum, 
  calculateColorFromSpectrum, 
  getBlueLEDSpectrum, 
  calculateCRI, 
  getLatticeStructure 
} from './utils/physics';

// --- 3D 辅助组件: 化学键 (自动旋转圆柱体) ---
const ChemicalBond = ({ start, end }) => {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const distance = startVec.distanceTo(endVec);
  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  
  // 计算旋转四元数
  const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  return (
    <mesh position={midPoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.02, 0.02, distance, 8]} />
      <meshStandardMaterial color="#666" opacity={0.4} transparent />
    </mesh>
  );
};

// --- 3D 组件: 晶体结构渲染器 (支持 Unit Cell 和 Nanocrystal) ---
const CrystalStructure = ({ mode, zrDoping, isCoreShell }) => {
  // mode: 'unit' (单胞) | 'cluster' (纳米晶簇)
  const { atoms, bonds } = useMemo(() => getLatticeStructure(mode, zrDoping), [mode, zrDoping]);

  return (
    <group>
      {/* 1. 原子渲染 */}
      {atoms.map((atom, i) => (
        <mesh key={`atom-${i}`} position={atom.pos}>
          {/* 使用物理引擎定义的半径 */}
          <sphereGeometry args={[atom.radius, 32, 32]} />
          <meshPhysicalMaterial 
            color={atom.color} 
            roughness={0.2} 
            metalness={0.5} 
            emissive={atom.type === 'Zr' ? '#3b82f6' : '#000'} // Zr 原子高亮显示
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      {/* 2. 化学键渲染 */}
      {bonds.map((bond, i) => (
        <ChemicalBond key={`bond-${i}`} start={bond.start} end={bond.end} />
      ))}

      {/* 3. 核壳结构的壳层暗示 (仅在 Cluster 模式下显示) */}
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

// --- 3D 组件: 宏观量子点球体 (您之前的代码，保留作为 simplified view) ---
const QuantumDotSphere = ({ radius, color, isCoreShell }) => (
  <group>
    {/* AgGaS2 核 */}
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

    {/* ZnS 壳层 */}
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

// --- 主程序 ---
const App = () => {
  // 状态管理
  // 增加 'cluster' 模式，这是展示掺杂最直观的方式
  const [viewMode, setViewMode] = useState('cluster'); // 'cluster' | 'unit' | 'dot'
  const [showComparison, setShowComparison] = useState(false);

  // 物理参数
  const [radius, setRadius] = useState(3.5);     
  const [fwhm, setFwhm] = useState(35);          
  const [reactionTime, setReactionTime] = useState(30); 
  const [zrDoping, setZrDoping] = useState(0);   
  const [isCoreShell, setIsCoreShell] = useState(false); 

  // 计算管线
  const { spectrum, centerWl, energy, sphereColor, criScore } = useMemo(() => {
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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: '#000', color: '#e5e5e5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 左侧控制面板 */}
      <div style={{ width: '380px', padding: '24px', background: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
          <div style={{ background: '#222', padding:'8px', borderRadius:'8px' }}>
            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
          </div>
          <div>
             <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>AgGaS₂ Lab</h1>
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
                <span style={{fontSize:'13px', color:'#fff'}}>Core-Shell Growth</span>
                <span style={{fontSize:'10px', color:'#555'}}>Grow ZnS shell (+Intensity)</span>
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
              <span style={{fontSize:'10px', color:'#444'}}>30 min</span>
              <span style={{fontSize:'10px', color:'#444'}}>Blue Shift Effect →</span>
              <span style={{fontSize:'10px', color:'#444'}}>90 min</span>
            </div>
          </div>

           <div style={{ background: '#111', padding: '12px', borderRadius: '8px' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
              <span style={{fontSize:'12px', color:'#ccc'}}>Core Radius</span>
              <span style={{fontSize:'12px', color: sphereColor}}>{radius} nm</span>
            </div>
            <input 
              type="range" min="2" max="6" step="0.1" 
              value={radius} onChange={e => setRadius(parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: sphereColor, height:'4px' }} 
            />
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
              <span style={{fontSize:'12px', color:'#ccc'}}>Doping Conc.</span>
              <span style={{fontSize:'12px', color: zrDoping > 0 ? '#60a5fa' : '#666'}}>{zrDoping} mmol</span>
            </div>
            <input 
              type="range" min="0" max="0.3" step="0.01" 
              value={zrDoping} onChange={e => setZrDoping(parseFloat(e.target.value))} 
              style={{ width: '100%', accentColor: '#60a5fa', height:'4px' }} 
            />
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'4px'}}>
              <span style={{fontSize:'10px', color:'#444'}}>Pure</span>
              <span style={{fontSize:'10px', color:'#444'}}>Dual Peak Emission</span>
              <span style={{fontSize:'10px', color:'#444'}}>0.3 mmol</span>
            </div>
          </div>
        </div>

        {/* 3. 数据图表 */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', gap:'10px' }}>
           <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <BarChart3 size={14} color="#888"/>
                <span style={{fontSize:'12px', fontWeight:'600', color:'#888'}}>SPECTRAL ANALYSIS</span>
              </div>
              <button 
                onClick={() => setShowComparison(!showComparison)}
                style={{ background: 'transparent', border:'none', color: showComparison ? '#3b82f6' : '#555', fontSize:'11px', cursor:'pointer' }}
              >
                {showComparison ? 'Hide' : 'Show'} Comparison
              </button>
           </div>

           <div style={{ flex: 1, background: '#111', padding: '12px', borderRadius: '8px', position:'relative' }}>
             <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <div>
                   <span style={{fontSize:'10px', color:'#666', display:'block'}}>CRI (Ra)</span>
                   <span style={{fontSize:'18px', fontWeight:'bold', color: criScore > 80 ? '#4ade80' : '#fff'}}>{criScore}</span>
                </div>
                <div>
                   <span style={{fontSize:'10px', color:'#666', display:'block'}}>Peak Wavelength</span>
                   <span style={{fontSize:'18px', fontWeight:'bold', color: sphereColor}}>{centerWl} <span style={{fontSize:'10px', color:'#666'}}>nm</span></span>
                </div>
             </div>
            
             {showComparison && (
                <div style={{ position:'absolute', top:'10px', right:'10px', background:'rgba(0,0,0,0.8)', padding:'8px', borderRadius:'4px', border:'1px solid #333', zIndex:10 }}>
                   <div style={{fontSize:'10px', color:'#888', marginBottom:'4px'}}>Traditional LED</div>
                   <div style={{fontSize:'11px', color:'#fbbf24'}}>Peak: 564nm | CRI: 61.5</div>
                   <div style={{fontSize:'10px', color:'#888', marginTop:'6px', marginBottom:'4px'}}>AgGaS₂/ZnS (Yours)</div>
                   <div style={{fontSize:'11px', color:'#4ade80'}}>Peak: {centerWl}nm | CRI: {criScore}</div>
                </div>
             )}

             <ResponsiveContainer width="100%" height="70%">
               <AreaChart data={spectrum}>
                 <defs>
                    <linearGradient id="colorQd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sphereColor} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={sphereColor} stopOpacity={0}/>
                    </linearGradient>
                 </defs>
                 <Area type="monotone" dataKey="intensity" stroke={sphereColor} fill="url(#colorQd)" strokeWidth={2} />
                 {showComparison && <ReferenceLine x={564} stroke="#fbbf24" strokeDasharray="3 3" />}
                 <XAxis dataKey="wl" tick={{fontSize:10}} interval={50} stroke="#444" />
                 <YAxis hide />
                 <Tooltip contentStyle={{background:'#000', border:'1px solid #333'}} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* 右侧 3D 视图 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <button onClick={() => setViewMode('cluster')} style={{ padding: '6px 12px', background: viewMode==='cluster'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='cluster'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Atom size={12}/> Nanocrystal
            </button>
            <button onClick={() => setViewMode('unit')} style={{ padding: '6px 12px', background: viewMode==='unit'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='unit'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Layers size={12}/> Unit Cell
            </button>
             <button onClick={() => setViewMode('dot')} style={{ padding: '6px 12px', background: viewMode==='dot'?'#fff':'rgba(0,0,0,0.5)', color: viewMode==='dot'?'#000':'#fff', border: '1px solid #333', borderRadius:'20px', cursor:'pointer', fontSize:'12px', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:'6px' }}>
               <Box size={12}/> Sphere View
            </button>
        </div>

        <Canvas camera={{ position: [0, 0, 7] }}>
          <color attach="background" args={['#050505']} />
          <Stars depth={50} count={2000} factor={4} fade />
          
          <ambientLight intensity={isCoreShell ? 0.4 : 0.2} />
          <pointLight position={[10, 10, 10]} intensity={isCoreShell ? 1.5 : 1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color={sphereColor} />
          
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
             {viewMode === 'dot' ? 
                <QuantumDotSphere radius={radius} color={sphereColor} isCoreShell={isCoreShell} /> : 
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
           <div style={{ color: sphereColor, fontSize:'14px', letterSpacing:'2px', opacity:0.8 }}>NANOMETERS</div>
           {isCoreShell && <div style={{ color: '#fff', fontSize:'10px', marginTop:'4px', opacity:0.4 }}>CORE-SHELL ENHANCED</div>}
           {zrDoping > 0 && <div style={{ color: '#3b82f6', fontSize:'10px', opacity:0.6 }}>Zr⁴⁺ DOPED</div>}
        </div>
      </div>
    </div>
  );
};

export default App;