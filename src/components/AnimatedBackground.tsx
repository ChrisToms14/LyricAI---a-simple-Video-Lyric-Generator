import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShaderPlane, EnergyRing } from './ui/background-paper-shaders';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="absolute inset-0 opacity-30">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          <ShaderPlane
            position={[-1, 0, -2]}
            color1="#e0c3fc"
            color2="#8ec5fc"
          />

          <EnergyRing
            radius={1.5}
            position={[2, 0, -1]}
          />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50" />

      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-blue-300/5 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
