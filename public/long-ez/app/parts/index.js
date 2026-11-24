// System part definitions, one module per work package. Each module calls defineParts / defineGraph /
// defineKeepouts / definePass / defineReqs from systems.js. Import order = work-package order.
import '../systems.js';
import './wp1_powerplant.js';
import './wp2_controls_gear.js';
import './wp3_electrical.js';
import './wp4_avionics_cabin.js';
import './wp6_engine_install.js';
import './wp7_wiring.js';
import './wp10_induction_gear.js';
import './wp11_nose_gear.js';
import './wp12_routing.js';
import './wp13_airframe_joints.js';
import './wp15_cs_spar.js';
import './wp16_wing_attach.js';
import './wp17_wing_panel.js';
import './wp18_winglet.js';
import './wp19_ctl.js';
import './wp20_jutout.js';
import './wp21_strake.js';
import './wp22_mount.js';
import './wp23_upk.js';
import './wp24_canard.js';
import './wp25_f22.js';
import './wp26_fuselage.js';
import './blk_a_airframe.js';
import './blk_b_cockpit.js';
import './blk_c_controls.js';
import './blk_d_maingear.js';
import './wpD3_pant.js';   // DC-005: wheel pants LEZ-32-320 and their mounting LEZ-32-321
import './blk_e_nosegear.js';
import './blk_f_fuel.js';
import './blk_g_powerplant.js';
import './blk_h_engsys.js';
import './blk_i_electrical.js';
import './blk_j_avionics.js';
import './blk_p_prepreg.js';
import './wp14_canopy_latch.js';
import './wp5_integration.js';
import './wp8_ident.js';
import './wpS1_yaw.js';   // directional stability and control (yaw-cnb, yaw-cndr, yaw-cnr)
import './wpR1_clear.js';   // DC-004: cabin routing clearance pass on the final routes (before LOAD.after rebuilds clamps and holes)
// every parts module has run: lazy geometry built from other parts' routes is rebuilt from here on (systems.js LOAD)
import { markLoaded } from '../systems.js';
markLoaded();
