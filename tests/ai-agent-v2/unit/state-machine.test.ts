import '../../../scripts/mock-setup';
import { validateTransition } from '../../../src/lib/ai-agent-v2/core/state-machine';

export async function testStateMachine() {
  console.log('   Checking State Machine transitions...');
  
  validateTransition('draft', 'planning');
  validateTransition('preview_ready', 'approved');
  validateTransition('approved', 'executing');
  validateTransition('executing', 'executed');
  validateTransition('executed', 'verified');
  
  let threw = false;
  try {
    validateTransition('draft', 'verified');
  } catch (err) {
    threw = true;
  }
  
  if (!threw) throw new Error('State Machine failed to prevent invalid transition: draft -> verified');
  
  console.log('   ✓ State Machine transition validation passed!');
  return true;
}
