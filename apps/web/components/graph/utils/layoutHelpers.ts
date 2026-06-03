import { cytoscapeLayoutConfig } from '@/lib/graph-builder';

export const getLayoutConfig = (layoutName: string, nodeCount: number, fitViewport = true) => {
  if (layoutName === 'cose-bilkent') {
    if (nodeCount > 300) {
      return {
        name: 'cose',
        animate: false,
        fit: fitViewport,
        padding: 30,
        nodeRepulsion: 150000,
        idealEdgeLength: 300,
        randomize: false,
      };
    }
    let numIter = 2500;
    let animate = true;
    if (nodeCount > 100) { numIter = 1500; animate = true; }
    return { ...cytoscapeLayoutConfig, animate, numIter, fit: fitViewport, randomize: false };
  }
  return {
    name: layoutName,
    animate: nodeCount < 500,
    animationDuration: 600,
    fit: fitViewport,
    padding: 30,
  };
};
