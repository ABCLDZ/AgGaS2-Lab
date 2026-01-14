// src/utils/physics.js

// ==========================================
// Part 1: 光谱与颜色物理引擎 (Spectroscopy)
// ==========================================

// CIE 1931 标准色度观察者数据 (2度视角)
const CMF = {
  380: [0.0014, 0.0000, 0.0065], 390: [0.0042, 0.0001, 0.0201], 400: [0.0143, 0.0004, 0.0679], 410: [0.0435, 0.0012, 0.2074],
  420: [0.1344, 0.0040, 0.6456], 430: [0.2839, 0.0116, 1.3856], 440: [0.3483, 0.0230, 1.7471], 450: [0.3362, 0.0380, 1.7721],
  460: [0.2908, 0.0600, 1.6692], 470: [0.1954, 0.0910, 1.2876], 480: [0.0956, 0.1390, 0.8130], 490: [0.0320, 0.2080, 0.4652],
  500: [0.0049, 0.3230, 0.2720], 510: [0.0093, 0.5030, 0.1582], 520: [0.0633, 0.7100, 0.0782], 530: [0.1655, 0.8620, 0.0422],
  540: [0.2904, 0.9540, 0.0203], 550: [0.4334, 0.9950, 0.0087], 560: [0.5945, 0.9950, 0.0039], 570: [0.7621, 0.9520, 0.0021],
  580: [0.9163, 0.8700, 0.0017], 590: [1.0263, 0.7570, 0.0011], 600: [1.0622, 0.6310, 0.0008], 610: [1.0026, 0.5030, 0.0003],
  620: [0.8544, 0.3810, 0.0002], 630: [0.6424, 0.2650, 0.0000], 640: [0.4479, 0.1750, 0.0000], 650: [0.2835, 0.1070, 0.0000],
  660: [0.1649, 0.0610, 0.0000], 670: [0.0874, 0.0320, 0.0000], 680: [0.0468, 0.0170, 0.0000], 690: [0.0227, 0.0082, 0.0000],
  700: [0.0114, 0.0041, 0.0000], 710: [0.0058, 0.0021, 0.0000], 720: [0.0029, 0.0010, 0.0000], 730: [0.0014, 0.0005, 0.0000]
};

// 基础光谱生成工具 (高斯分布)
export const generateGaussianSpectrum = (centerWl, fwhm) => {
  const sigma = fwhm / 2.355;
  const data = [];
  for (let wl = 380; wl <= 780; wl += 5) {
    const intensity = Math.exp(-Math.pow(wl - centerWl, 2) / (2 * Math.pow(sigma, 2)));
    data.push({ wl, intensity });
  }
  return data;
};

// 模拟蓝光 LED 激发源 (455nm)
export const getBlueLEDSpectrum = () => generateGaussianSpectrum(455, 20);

/**
 * 核心物理计算：AgGaS2 量子点能带与发射波长
 * @param {number} radiusNm - 量子点半径
 * @param {number} reactionTime - 反应时间 (影响反常蓝移)
 * @param {boolean} isCoreShell - 是否包覆 ZnS 壳层 (影响红移)
 */
export const calculateEmissionParams = (radiusNm, reactionTime = 30, isCoreShell = false) => {
  const Eg_bulk = 2.73; // AgGaS2 体材料带隙 (eV)
  
  // 1. 量子限域效应 (Brus 公式简化版): 尺寸越小，带隙越大
  const confinement = 0.8 / (radiusNm * radiusNm); 
  // 2. 库仑相互作用修正
  const coulomb = 0.3 / radiusNm;
  // 3. 缺陷能级 Stokes 位移 (模拟从导带底到缺陷能级的跃迁)
  const defectShift = 0.65 + (0.1 / radiusNm); 

  // 基础发射能量 (eV)
  let emissionEnergy = Eg_bulk + confinement - coulomb - defectShift;

  // --- 物理复现 A: 反应时间导致的"反常蓝移" ---
  // 现象：反应时间 30min -> 90min，波长 570nm -> 520nm (能量增加)
  // 机制：Ga2S3 合金化效应或表面态钝化
  if (reactionTime > 30) {
    // 线性插值：每增加 60min，能量增加约 0.17 eV
    const timeFactor = (reactionTime - 30) * (0.17 / 60); 
    emissionEnergy += timeFactor; 
  }

  // --- 物理复现 B: ZnS 壳层导致的"红移" ---
  // 现象：包覆 ZnS 壳层后，波长发生红移 (能量降低)
  // 机制：电子波函数泄漏(Tunneling)及晶格失配应力
  if (isCoreShell) {
    const shellShift = 0.09; // 对应约 20nm 的红移
    emissionEnergy -= shellShift; 
  }

  // 能量转波长公式: lambda = 1240 / E
  let peakWl = 1240 / emissionEnergy;
  
  // 限制波长范围，防止数值溢出
  peakWl = Math.min(Math.max(peakWl, 400), 700);

  return { 
    energy: emissionEnergy.toFixed(3), 
    wl: parseFloat(peakWl.toFixed(1))
  };
};

/**
 * 混合光谱生成逻辑
 * @param {number} baseWl - 基质(AgGaS2)的主峰波长
 * @param {number} fwhm - 半峰宽
 * @param {number} zrConc - Zr 掺杂浓度 (0 - 0.3 mmol)
 */
export const generateCompositeSpectrum = (baseWl, fwhm, zrConc = 0) => {
  const data = [];
  
  // Zr 掺杂引入的特征发光峰 (论文观测值 ~470nm，位置相对固定)
  const zrPeakWl = 470; 
  const zrPeakFwhm = 25; 

  // 归一化浓度处理
  const maxConc = 0.3;
  const normalizedConc = Math.min(zrConc / maxConc, 1.0); 

  // --- 物理复现 C: 能量转移与猝灭机制 ---
  // 随着 Zr 浓度增加，能量从基质转移到 Zr 缺陷中心
  // 1. 基质峰 (Base) 强度下降 (Quenching)
  const baseWeight = 1.0 - normalizedConc; 
  // 2. 杂质峰 (Zr) 强度上升
  const zrWeight = normalizedConc * 1.5;   

  for (let wl = 380; wl <= 780; wl += 5) {
    // 计算 AgGaS2 主峰分量
    const sigma1 = fwhm / 2.355;
    const intensity1 = baseWeight * Math.exp(-Math.pow(wl - baseWl, 2) / (2 * Math.pow(sigma1, 2)));
    
    // 计算 Zr 杂质峰分量
    const sigma2 = zrPeakFwhm / 2.355;
    const intensity2 = zrWeight * Math.exp(-Math.pow(wl - zrPeakWl, 2) / (2 * Math.pow(sigma2, 2)));
    
    // 叠加光谱
    data.push({ wl, intensity: intensity1 + intensity2 });
  }
  return data;
};

// 光谱转 RGB 颜色 (CIE XYZ 算法)
export const calculateColorFromSpectrum = (spectrum) => {
  let X = 0, Y = 0, Z = 0;
  spectrum.forEach(p => {
    const wl = Math.round(p.wl / 10) * 10;
    if (CMF[wl]) {
      X += p.intensity * CMF[wl][0];
      Y += p.intensity * CMF[wl][1];
      Z += p.intensity * CMF[wl][2];
    }
  });

  const sum = X + Y + Z;
  if (sum === 0) return { hex: '#000000', x: 0, y: 0 };

  const cx = (X / sum).toFixed(4);
  const cy = (Y / sum).toFixed(4);

  // XYZ to sRGB 矩阵变换
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;

  const max = Math.max(r, g, b, 1);
  r = r / max; g = g / max; b = b / max; 

  // Gamma 校正
  const gammaCorrect = (c) => c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
  
  r = gammaCorrect(Math.max(r, 0));
  g = gammaCorrect(Math.max(g, 0));
  b = gammaCorrect(Math.max(b, 0));

  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);

  return { hex: `rgb(${R},${G},${B})`, x: cx, y: cy };
};

// 显色指数 (CRI) 估算
// 基于 R/G/B 比例的简化算法，用于实时演示
export const calculateCRI = (spectrum) => {
  let total = 0, r = 0, g = 0, b = 0;
  spectrum.forEach(p => {
    total += p.intensity;
    if(p.wl > 600) r += p.intensity; // 红光分量
    else if(p.wl > 510) g += p.intensity; // 绿光分量
    else b += p.intensity; // 蓝光分量
  });
  
  if (total === 0) return 0;
  
  // 白光平衡度越好，CRI 越高
  const balance = (Math.min(r, g, b * 1.5) / (total / 3.5)); 
  return Math.min(Math.round(60 + balance * 40), 98);
};


// ==========================================
// Part 2: 晶体结构引擎 (Crystallography)
// ==========================================

// 原子定义：AgGaS2 + Zr Dopant
const ATOM_DEFS = {
  Ag: { radius: 0.15, color: '#C0C0C0', label: 'Silver' }, // 银：大半径，银灰
  Ga: { radius: 0.12, color: '#DAA520', label: 'Gallium' }, // 镓：中半径，金橙
  S:  { radius: 0.08, color: '#FFFF00', label: 'Sulfur' }, // 硫：小半径，亮黄
  Zr: { radius: 0.12, color: '#3b82f6', label: 'Zirconium' } // 锆：掺杂原子，亮蓝
};

// 黄铜矿 (Chalcopyrite) 晶胞参数 (Space Group I-42d)
// 归一化比例 a=1, c=1.8 (真实 c/a ≈ 1.8)
const LATTICE_CONST = { a: 1, c: 1.8 };

/**
 * 生成原子列表
 * @param {string} mode - 'unit' (单胞) | 'cluster' (纳米晶簇)
 * @param {number} zrConc - Zr 掺杂浓度 (影响随机替换概率)
 */
export const getLatticeStructure = (mode = 'unit', zrConc = 0) => {
  let atoms = [];
  
  // 1. 定义标准单胞内的基元 (Basis)
  // 坐标来源于 AgGaS2 晶体学数据 (Wyckoff positions)
  const basis = [
    // Ag (4a)
    { u:0, v:0, w:0, type:'Ag' },
    { u:0, v:0.5, w:0.25, type:'Ag' },
    { u:0.5, v:0.5, w:0.5, type:'Ag' }, // I-center shift of (0,0,0)
    { u:0.5, v:0, w:0.75, type:'Ag' },  // I-center shift of (0,0.5,0.25)

    // Ga (4b)
    { u:0, v:0, w:0.5, type:'Ga' },
    { u:0, v:0.5, w:0.75, type:'Ga' },
    { u:0.5, v:0.5, w:0, type:'Ga' },
    { u:0.5, v:0, w:0.25, type:'Ga' },

    // S (8d) - 近似位置 x=0.25
    { u:0.25, v:0.25, w:0.125, type:'S' },
    { u:0.75, v:0.25, w:0.875, type:'S' },
    { u:0.25, v:0.75, w:0.125, type:'S' },
    { u:0.75, v:0.75, w:0.875, type:'S' },
    // Body-centered shifts for S
    { u:0.75, v:0.75, w:0.625, type:'S' },
    { u:0.25, v:0.75, w:0.375, type:'S' },
    { u:0.75, v:0.25, w:0.625, type:'S' },
    { u:0.25, v:0.25, w:0.375, type:'S' }
  ];

  // 2. 确定生成的晶胞范围 (Supercell Range)
  let rangeX = 1, rangeY = 1, rangeZ = 1;
  
  if (mode === 'cluster') {
    // 纳米晶簇：生成 2x2x2 的超胞，然后裁剪成球形
    rangeX = 2; rangeY = 2; rangeZ = 2; 
  }

  // 3. 遍历生成原子
  // Zr 替换概率: 简单模拟，0.3mmol 对应约 10% 的 Ga 被替换
  const dopingProb = Math.min(zrConc / 0.3 * 0.15, 1.0);

  const centerOffset = { x: rangeX/2, y: rangeY/2, z: rangeZ/2 };

  for (let x = 0; x < rangeX; x++) {
    for (let y = 0; y < rangeY; y++) {
      for (let z = 0; z < rangeZ; z++) {
        
        basis.forEach(atomBase => {
          // 计算绝对位置
          const posX = (atomBase.u + x);
          const posY = (atomBase.v + y);
          const posZ = (atomBase.w + z) * LATTICE_CONST.c; // 伸缩 C 轴

          // 居中偏移
          const finalX = (posX - centerOffset.x) * 1.5; // 1.5倍间距让视觉更宽松
          const finalY = (posY - centerOffset.y) * 1.5;
          const finalZ = (posZ - centerOffset.z * LATTICE_CONST.c) * 1.5;

          // 裁剪逻辑 (仅Cluster模式)
          if (mode === 'cluster') {
            const dist = Math.sqrt(finalX*finalX + finalY*finalY + finalZ*finalZ);
            if (dist > 2.2) return; // 球形裁剪
          }

          // 掺杂逻辑
          let finalType = atomBase.type;
          if (finalType === 'Ga' && Math.random() < dopingProb) {
            finalType = 'Zr';
          }

          atoms.push({
            pos: [finalX, finalY, finalZ],
            type: finalType,
            ...ATOM_DEFS[finalType]
          });
        });

      }
    }
  }

  // 4. 自动成键 (Auto Bonding)
  // 规则：连接 S 原子与最近邻的阳离子 (Ag, Ga, Zr)
  // 阈值：2.6埃 (缩放后约为 0.6 单位)
  const bonds = [];
  const bondThreshold = 0.8; // 稍微放宽以确保连接

  atoms.forEach((atom1, i) => {
    if (atom1.type !== 'S') return; // 只从 S 出发寻找配位体

    atoms.forEach((atom2, j) => {
      if (i === j) return;
      if (atom2.type === 'S') return; // S 不连 S

      const dx = atom1.pos[0] - atom2.pos[0];
      const dy = atom1.pos[1] - atom2.pos[1];
      const dz = atom1.pos[2] - atom2.pos[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (dist < bondThreshold) {
        // 避免重复键 (只存单向，或渲染时无所谓)
        bonds.push({
          start: atom1.pos,
          end: atom2.pos,
          color: '#555' // 键的颜色
        });
      }
    });
  });

  return { atoms, bonds };
};