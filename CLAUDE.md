# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ticketmaster Master** - A browser-based game simulating the chaotic TicketMaster ticket-buying experience. Players race against time to purchase concert tickets while dealing with:
- Dynamically changing prices with visual indicators
- Randomly appearing/disappearing seat availability
- Target ticket matching system (must buy adjacent seats)
- CAPTCHA challenges with time pressure
- Scoring based on savings vs base prices
- Single-player and multiplayer competitive modes

## Development Commands

Simply open `index.html` in a web browser - no build system required.

**External Dependencies:**
- PeerJS v1.5.1 (loaded via CDN) - WebRTC peer-to-peer networking for multiplayer

## Architecture

### File Structure (Modular Architecture)

**HTML/CSS:**
- `index.html` - Main game structure with modals (start, multiplayer setup, host/join, multiple CAPTCHA types, game over, waiting room, debug panel)
- `styles.css` - Complete styling with responsive design and color-coded pricing

**Core JavaScript Modules:**
- `js/main.js` - Entry point, module initialization and coordination
- `js/gameState.js` - Central game state management with getters/setters
- `js/config.js` - Game configuration constants (prices, timing, probabilities)
- `js/gameFlow.js` - Game lifecycle management (start, end, timer, updates)
- `js/ui.js` - UI update functions (timer, score, target display)
- `js/eventListeners.js` - Event handler setup for all UI interactions

**Feature Modules:**
- `js/seatManagement.js` - Seat generation, rendering, selection, validation (including block seat logic)
- `js/cartManagement.js` - Cart operations (add, remove, display, total calculation)
- `js/checkout.js` - Purchase validation and CAPTCHA triggering
- `js/multiplayer.js` - PeerJS networking and host-authoritative synchronization

**CAPTCHA Modules:**
- `js/captcha/textCaptcha.js` - Traditional alphanumeric code entry
- `js/captcha/gasPumpCaptcha.js` - Stop-the-counter reflex challenge
- `js/captcha/puzzleCaptcha.js` - Slider-based puzzle piece positioning
- `js/captcha/fishingCaptcha.js` - Canvas-based fishing mini-game
- `js/captcha/nbaCaptcha.js` - Two-stage free throw basketball game
- `js/captcha/lunarLanderCaptcha.js` - Physics-based lunar landing simulation
- `js/captcha/tanksCaptcha.js` - Artillery aiming game with angle and power
- `js/captcha/dartsCaptcha.js` - Steady hand dartboard bullseye challenge

**Legacy:**
- `game.js` - Original monolithic version (kept for reference, not loaded)

### Game State Management
The game uses a single `gameState` object to track:
- Timer (2 minutes countdown)
- Score (based on savings)
- Cart (selected seats)
- Seats array (96 seats with pricing and availability)
- CAPTCHA state
- Target ticket count (1-4 tickets per round)
- Purchase history (for end-game review)
- Multiplayer connection state and opponent info
- Skip count and penalties

### Multiplayer Architecture (Host-Authoritative Model)

**IMPORTANT DESIGN DECISION:** We use a host-authoritative architecture where the host is the single source of truth for all randomness and game state.

**Why Host-Authoritative?**
- Originally attempted synchronized randomness using seeded random generators
- Timer-based updates with modulo operations caused desync (different client timings)
- Host-authoritative provides perfect synchronization with simpler code
- Single source of truth eliminates race conditions

**Implementation:**
1. **Host Responsibilities:**
   - Generates all random values (seat availability, prices, targets)
   - Broadcasts updates to guest via PeerJS messages
   - Tracks game state and validates purchases
   - **Protects opponent's cart seats**: Doesn't change availability or prices for seats in opponent's cart

2. **Guest Responsibilities:**
   - Receives state updates from host
   - Updates UI based on host's messages
   - Sends cart updates to host (so host knows which seats to protect)
   - Sends purchase requests to host

3. **Message Types:**
   - `initialState` - Full game state on connection
   - `targetUpdate` - New target ticket count
   - `availabilityUpdate` - Seat availability changes
   - `priceUpdate` - Seat price changes
   - `cartUpdate` - Player's cart changes (bidirectional)
   - `seatClaimed` - Player completed purchase (bidirectional)
   - `scoreUpdate` - Score changes (bidirectional)
   - `gameEnd` - Game over notification

### Key Game Mechanics

1. **Target Ticket System**:
   - Random target count (1-4 tickets) generated each round
   - Must purchase exactly the target count
   - **Adjacency Rules:**
     - 1-3 seats: Must be adjacent (side-by-side) in the same row
     - 4+ seats: Can form a rectangular "block" spanning up to 2 rows
     - Block seats must be touching (no gaps) and form a valid rectangular shape
   - Skip button available for -50 pts penalty
   - New target appears after successful purchase or skip

2. **Seat Updates**:
   - Availability changes every 2 seconds (host-driven in multiplayer)
   - Prices fluctuate every 3 seconds (±30% of base price, host-driven in multiplayer)
   - In multiplayer, claimed seats become unavailable to opponent

3. **Pricing System**:
   - All face values are multiples of $20 (clean pricing)
   - Base prices: $60-300
   - 7-tier color coding for visual feedback:
     - Dark green (#0d6832): 20%+ discount
     - Medium green (#15803d): 10-19% discount
     - Light green (#16a34a): 5-9% discount
     - Very light green (#22c55e): 0-4% discount
     - Light red (#ef4444): 0-5% premium
     - Medium red (#dc2626): 5-10% premium
     - Dark red (#b91c1c): 10%+ premium

4. **CAPTCHA System** (8 Different Types):
   - 60% chance on checkout (100% if competing with opponent for same seats)
   - Random CAPTCHA type selected each time
   - Warning shown if opponent is competing for same seats

   **CAPTCHA Types:**
   - **Text CAPTCHA**: Traditional 6-character alphanumeric code entry (10s timer)
   - **Gas Pump**: Stop the counter at exact target amount, 3 attempts (no timer, pressure-based)
   - **Puzzle Slider**: Drag slider to position puzzle piece correctly (10s timer, ±10px tolerance)
   - **Fishing Game**: Keep fish in green zone to fill progress bar (15s timer, canvas-based physics)
   - **NBA Free Throw**: Two-stage basketball shot (horizontal aim + power control, 10s timer)
   - **Lunar Lander**: Land the lunar module safely with realistic physics (15s timer, hold button for thrust)
   - **Tanks Artillery**: Hit enemy tank by adjusting angle and power (20s timer, projectile physics)
   - **Darts Bullseye**: Steady your hand - throw dart when moving crosshair is over bullseye (15s timer, timing-based)

5. **Scoring**:
   - Points earned = total savings (base price - purchase price)
   - Skip penalty: -50 pts per skipped target
   - Purchase history tracked for end-game review

6. **Purchase History**:
   - Tracks all purchases with seat details
   - Shows face value, paid price, discount/premium percentage per seat
   - Calculates totals: total face value, total paid, total savings/premium
   - Seats sorted by row letter, then column number
   - Displayed in game-over modal

7. **Waiting Room Animation**:
   - Fake "Ticketmaster waiting room" shown before game starts
   - Progress bar with animated stick figure
   - Countdown timer with realistic "fans in front of you" counter
   - Creates authentic Ticketmaster experience

8. **Debug Mode**:
   - Toggle with backtick (`) key during gameplay
   - Test all CAPTCHA types without starting a game
   - Hidden panel for development and testing
   - Does not affect game state when testing CAPTCHAs

## Key Patterns and Conventions

- Pure vanilla JS - no frameworks (except PeerJS for multiplayer)
- **ES6 Modules**: Code organized into separate modules with explicit imports/exports
- Event-driven architecture using `addEventListener`
- Interval-based game loop for timer and dynamic updates (host-driven in multiplayer)
- CSS Grid for seat layout (12x8 grid = 96 seats)
- **Canvas API**: Used for visual CAPTCHAs (fishing, NBA free throw, puzzle piece)
- Modal system for overlays (start, multiplayer setup, multiple CAPTCHAs, game over, waiting room)
- Responsive design with mobile support
- Host-authoritative multiplayer (no client-side prediction)
- Centralized state management through `gameState.js` with getter/setter pattern

## Design Decisions & Evolution

### UI/UX Decisions

1. **Color-Coded Pricing (7 Tiers)**
   - **Problem:** Players couldn't quickly identify good deals vs bad deals
   - **Solution:** Added color-coded price text with 7 distinct tiers
   - **Colors:** Green shades for discounts, red shades for premiums
   - **Result:** Visual feedback makes decision-making faster and more intuitive

2. **Available Seat Color Change (Green → Blue)**
   - **Problem:** Green price text was illegible on green seat backgrounds
   - **Initial Attempt:** Added semi-transparent white background behind text
   - **Final Solution:** Changed available seats from green to blue gradient (#3b82f6 → #60a5fa)
   - **Rationale:** Better contrast with both green and red price text

3. **Round Number Pricing ($20 Multiples)**
   - **Problem:** Prices like $87.34 felt arbitrary and unrealistic
   - **Solution:** All face values rounded to multiples of $20 (e.g., $60, $80, $100)
   - **Implementation:** Changed min price from $50 to $60, added rounding: `Math.round(basePrice * randomFactor / 20) * 20`
   - **Result:** Cleaner, more realistic ticket prices

4. **Skip Penalty Display ($ → pts)**
   - **Problem:** Skip penalty shown as "$50" was confusing - it's a point penalty, not money
   - **Solution:** Changed all skip penalty references from "$50" to "50 pts"
   - **Locations:** Skip button, instructions, game-over modal
   - **Result:** Clearer understanding of the penalty system

### Gameplay Decisions

5. **Target Ticket System**
   - **Why:** Added challenge and strategy beyond "buy everything cheap"
   - **Constraint:** Must buy adjacent seats in same row
   - **Skip Option:** -50 pts penalty for impossible scenarios
   - **Result:** Forces players to make trade-offs between speed and perfection

6. **Purchase History Review**
   - **Why:** Players wanted to review their decisions after the game
   - **Features:**
     - Shows each purchase group with individual seat details
     - Calculates and displays totals (face value, paid, savings/premium)
     - Sorts seats by row letter, then column number
     - Color-codes savings (green) vs premiums (red)
   - **Result:** Post-game analysis and learning

7. **Block Seat Selection (4+ Tickets)**
   - **Problem:** With only single-row adjacency, finding 4+ adjacent seats was nearly impossible
   - **Solution:** Allow 4+ seat selections to span 2 rows as rectangular blocks
   - **Validation:** Must form touching rectangle (no gaps, diagonal not allowed)
   - **Examples:** 2x2 block, 3+2 L-shape, 2+3 offset block
   - **Result:** Makes larger purchases feasible while maintaining challenge

8. **Multiple CAPTCHA Types (Variety & Engagement)**
   - **Problem:** Single text CAPTCHA became repetitive and boring
   - **Solution:** Added 4 additional interactive CAPTCHA types with varied mechanics
   - **Types:** Gas pump (reflex), Puzzle slider (precision), Fishing (timing), NBA (two-stage skill)
   - **Random Selection:** Different CAPTCHA each checkout keeps gameplay fresh
   - **Result:** More engaging, less predictable, better simulates real CAPTCHA frustration

9. **Waiting Room Animation**
   - **Problem:** Abrupt transition from start screen to game felt jarring
   - **Solution:** Added Ticketmaster-style "waiting room" with countdown
   - **Features:** Progress bar, animated stick figure, fake "fans ahead" counter
   - **Result:** Builds anticipation and enhances Ticketmaster authenticity

10. **Debug Mode for CAPTCHA Testing**
    - **Problem:** Testing individual CAPTCHAs required starting full game
    - **Solution:** Hidden debug panel (backtick key) to test any CAPTCHA independently
    - **Why:** Speeds up development and balancing of CAPTCHA difficulty
    - **Result:** Faster iteration on CAPTCHA mechanics

### Technical Decisions

11. **Modular Architecture Refactor** (Major)
    - **Original:** Single 1500+ line `game.js` file with all logic
    - **Problem:** Difficult to maintain, test, and add features; merge conflicts inevitable
    - **Solution:** Complete refactor into ES6 modules by functional domain
    - **Structure:**
      - Core modules: gameState, gameFlow, config, ui, eventListeners
      - Feature modules: seatManagement, cartManagement, checkout, multiplayer
      - CAPTCHA modules: One file per CAPTCHA type
    - **Benefits:**
      - Clear separation of concerns
      - Easier to add new features (new CAPTCHAs = new file)
      - Better code organization and discoverability
      - Enables parallel development
    - **Trade-offs:** More files to manage, but worth it for maintainability

12. **Host-Authoritative Multiplayer** (Most Important)
    - **Initial Approach:** Seeded random number generators with shared seed
    - **Problem:** Timer-based updates happened at different times on each client due to:
      - Different start times
      - Browser performance variations
      - Network latency
    - **Solution:** Complete architectural refactor to host-authoritative model
    - **Benefits:**
      - Perfect synchronization (single source of truth)
      - Simpler code (no complex sync logic)
      - Easier to debug (centralized state)
      - Prevents cheating (host validates everything)
    - **Trade-offs:** Host has authority; guest has some input lag (acceptable for this game type)

13. **PeerJS for Multiplayer**
    - **Why:** Simple WebRTC abstraction without server requirements
    - **Architecture:** Direct peer-to-peer connection
    - **Benefits:** No backend needed, low latency
    - **Trade-offs:** Requires both players to have good network connectivity

14. **Canvas-Based Interactive CAPTCHAs**
    - **Why:** Create more engaging, game-like verification challenges
    - **Implementation:** HTML5 Canvas API for rendering and interaction
    - **Physics:** Custom physics for fishing game (gravity, buoyancy, drag)
    - **Animation:** RequestAnimationFrame loops for smooth 60fps rendering
    - **Result:** More fun CAPTCHAs that feel like mini-games

## Common Pitfalls & Gotchas

1. **Module Import Paths Must Be Exact**
   - ES6 modules require explicit `.js` extensions in import statements
   - Use relative paths: `import { foo } from './module.js'` not `from './module'`
   - Browser won't auto-resolve extensions like Node.js does

2. **Don't Use Math.random() in Multiplayer Mode**
   - Host generates all randomness and broadcasts to guest
   - Using Math.random() on guest causes desync

3. **Cart Seat Protection in Multiplayer**
   - When host updates seat availability or prices, it must check `opponentCart` array
   - Seats in opponent's cart are protected from changes (prevents CAPTCHA issues)
   - This prevents seats from disappearing or changing price while opponent is purchasing
   - **Both players can select the same seats**: Whoever completes CAPTCHA first wins the seats
   - **No visual indicator** for opponent's cart - keeps competition suspenseful until CAPTCHA warning

4. **Block Seat Validation (4+ Seats)**
   - For 1-3 seats: Must be adjacent in same row
   - For 4+ seats: Can form rectangular block across 2 rows
   - Block validation checks: All seats touching (no gaps), valid rectangular shape
   - Diagonal connections don't count as "touching"

5. **Canvas CAPTCHA Cleanup**
   - Must clear animation intervals/requestAnimationFrame on cancel or completion
   - Failure to cleanup causes CAPTCHAs to continue running in background
   - Use `cancelAnimationFrame()` for RAF loops
   - Clear all timers with `clearInterval()` and `clearTimeout()`

6. **CAPTCHA State Isolation**
   - Each CAPTCHA module should manage its own state independently
   - Don't share state between different CAPTCHA types
   - Clean up event listeners when CAPTCHA closes

7. **Price Color Calculation**
   - Based on percentage discount: `((basePrice - currentPrice) / basePrice) * 100`
   - Positive = discount (green), negative = premium (red)

8. **Debug Mode Key Binding**
   - Debug mode toggles with backtick (`) key
   - Only works when game is running (not in menus)
   - Changed from tilde (~) to backtick for easier access

## CAPTCHA Implementation Details

Each CAPTCHA type is self-contained in its own module with consistent interface:

### Common Interface Pattern
All CAPTCHA modules export:
- `showCAPTCHA()` - Main entry point (NO parameters!)
- Internal state management using local variables (NOT global gameState)
- Timer management with cleanup
- Success calls `window.completeCheckout()` directly
- Cancel/timeout just calls `cleanup()` (hides modal, removes listeners)
- Multiplayer warning support via `gameState.isMultiplayer` and `hasOverlappingSeats()`

### Individual CAPTCHA Mechanics

**1. Text CAPTCHA** (`textCaptcha.js`)
- Generates 6-character alphanumeric code (excludes confusing chars: 0, O, l, I)
- 10-second timer
- Case-insensitive validation
- Simple DOM manipulation, no canvas

**2. Gas Pump CAPTCHA** (`gasPumpCaptcha.js`)
- Target amount: Random $15-40 in $5 increments
- Counter increments at varying speeds (simulates gas pump)
- 3 attempts to stop within $0.01 of target
- No time limit (pressure from attempt count)
- Tests reflexes and timing

**3. Puzzle Slider CAPTCHA** (`puzzleCaptcha.js`)
- Generates random background image (gradient patterns)
- Canvas-based: Main image with cutout, draggable puzzle piece
- Slider controls horizontal position (0-340px range)
- Success tolerance: ±10px from correct position
- 10-second timer
- Visual feedback when piece aligns correctly

**4. Fishing CAPTCHA** (`fishingCaptcha.js`)
- Most complex: Full physics simulation on canvas
- Fish bobs up/down with custom physics (gravity, buoyancy)
- Green "catch zone" moves with fish
- Player button controls upward force
- Must keep fish in green zone to fill progress bar (100%)
- Progress drains when fish outside zone
- 15-second timer (longest of all CAPTCHAs)
- Uses `requestAnimationFrame` for 60fps rendering

**5. NBA Free Throw CAPTCHA** (`nbaCaptcha.js`)
- Two-stage challenge:
  - **Stage 1 (Horizontal Aim):** Moving indicator, click when in center zone
  - **Stage 2 (Power):** Rising power bar, click at 65-85% range
- Canvas-based rendering with basketball court and hoop
- Both stages must succeed to pass CAPTCHA
- Visual feedback: Ball trajectory animation on success
- 10-second timer
- Tests timing and precision in sequence

**6. Lunar Lander CAPTCHA** (`lunarLanderCaptcha.js`)
- Classic lunar landing physics simulation on canvas
- Player must land the module at ≤ 4 m/s to succeed
- Realistic moon physics:
  - Gravity: 1.622 m/s² (actual moon gravity)
  - Thrust acceleration: 5 m/s² when button held
  - Fuel consumption: 8% per second while thrusting
  - Limited fuel (100%) adds strategy element
- Hold-to-thrust button mechanic (intuitive for mobile and desktop)
- 15-second timer
- Real-time UI displays: altitude, velocity (color-coded), fuel bar
- Visual elements: Stars, moon surface, landing pad, lunar module with animated thrust flame
- Success/failure animations with velocity display
- Tests resource management, timing, and physics understanding

**7. Tanks CAPTCHA** (`tanksCaptcha.js`)
- Artillery game: hit enemy tank by adjusting angle and power
- Two tanks on mountains separated by valley
- Randomly generated terrain with mountains and valley
- Player controls blue tank (left), enemy is red tank (right)
- Angle slider: 0-90 degrees
- Power slider: 10-100%
- Realistic projectile physics with gravity
- Visual aim line showing trajectory direction
- Projectile trail effect (yellow)
- 20-second timer (longest timer)
- Multiple attempts allowed until time runs out
- Tests physics understanding, aiming skill, and adjustment

**8. Darts Bullseye CAPTCHA** (`dartsCaptcha.js`)
- Steady hand challenge: hit the bullseye with a dart throw
- Crosshair moves in Lissajous curve pattern (combining two oscillations at different speeds)
- Motion creates organic figure-8 like patterns that pass through the bullseye center
- Randomized speeds and radii on each game for unpredictability
- Player clicks "THROW DART" button to throw at current crosshair position
- Dartboard with classic concentric rings (bullseye, 25, 50, 75, 100 point zones)
- Crosshair changes color to green when over bullseye (visual cue for timing)
- Success requires dart landing within bullseye radius (~25px)
- Miss shows distance from bullseye and allows retry
- 15-second timer
- Multiple attempts allowed until time runs out or success
- Canvas-based rendering with smooth 60fps animation
- Tests timing, reflex, and precision (different from Tanks' physics-based aiming)

### CAPTCHA Selection Logic
Random selection on checkout, weighted equally (12.5% chance each for 8 types). Can be modified in checkout logic if certain CAPTCHAs should appear more/less frequently.

### HOW TO CREATE A NEW CAPTCHA (Step-by-Step Pattern)

**IMPORTANT:** Follow this exact pattern when creating new CAPTCHAs to ensure consistency and avoid common errors.

#### 1. Create the CAPTCHA Module File
**Location:** `js/captcha/yourCaptcha.js`

**Required Structure:**
```javascript
// Import dependencies
import { gameState } from '../gameState.js';
import { hasOverlappingSeats } from '../cartManagement.js';

// Module-level state (NOT the global gameState)
let animationId = null;
let captchaGameState = null;  // Use a local state variable, don't reuse gameState

// Constants
const TIMER_DURATION = 15; // Adjust as needed

// Main export function - NO PARAMETERS!
export function showCAPTCHA() {
    // Get DOM elements
    const modal = document.getElementById('your-captcha-modal');
    const canvas = document.getElementById('your-canvas');
    // ... other elements

    // Check for multiplayer competition warning
    const warningEl = document.getElementById('your-captcha-warning');
    if (gameState.isMultiplayer && hasOverlappingSeats()) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Initialize local game state
    captchaGameState = {
        timeRemaining: TIMER_DURATION,
        // ... other state specific to this CAPTCHA
    };

    // Set up event listeners
    const handleAction = () => { /* ... */ };
    const handleCancel = () => { cleanup(); };

    someButton.addEventListener('click', handleAction);
    cancelButton.addEventListener('click', handleCancel);

    // Start timer
    const timerInterval = setInterval(() => {
        captchaGameState.timeRemaining--;
        timerDisplay.textContent = captchaGameState.timeRemaining;

        if (captchaGameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            // Show failure message
            setTimeout(() => { cleanup(); }, 2000);
        }
    }, 1000);

    // Cleanup function
    function cleanup() {
        clearInterval(timerInterval);
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        // Remove ALL event listeners
        someButton.removeEventListener('click', handleAction);
        cancelButton.removeEventListener('click', handleCancel);
        modal.classList.add('hidden');
        captchaGameState = null;
    }

    // Success handler - call window.completeCheckout()
    function handleSuccess() {
        cleanup();
        if (window.completeCheckout) window.completeCheckout();
    }

    // Show modal and start
    modal.classList.remove('hidden');
    // ... initialization code
}
```

**KEY POINTS:**
- ✅ Export function named `showCAPTCHA()` with **NO parameters**
- ✅ Use local state variable (e.g., `captchaGameState`), NOT the global `gameState`
- ✅ Import `gameState` only to check `gameState.isMultiplayer`
- ✅ On success: call `window.completeCheckout()`, NOT a callback
- ✅ On cancel/timeout: just call `cleanup()`, no callback needed
- ✅ Always include multiplayer warning check
- ✅ Clean up ALL event listeners and timers in cleanup()
- ✅ Use `cancelAnimationFrame()` for canvas animations

#### 2. Add HTML Modal
**Location:** `index.html` (after other CAPTCHA modals, before Game Over Modal)

**Required Structure:**
```html
<!-- Your CAPTCHA Modal -->
<div id="your-captcha-modal" class="modal hidden">
    <div class="modal-content">
        <h2>Security Verification</h2>
        <p>Your instruction text here!</p>
        <div id="your-captcha-warning" class="captcha-warning hidden">
            ⚠️ Warning: Another player is competing for these seats!
        </div>
        <div class="captcha-timer">
            Time: <span id="your-timer">15</span>s
        </div>
        <div class="your-game-container">
            <canvas id="your-canvas" width="400" height="300"></canvas>
            <!-- Controls and UI -->
        </div>
        <div class="captcha-buttons">
            <button id="your-action-btn" class="btn-primary btn-large">ACTION</button>
            <button id="your-cancel-btn" class="btn-secondary">Cancel</button>
        </div>
        <div id="your-feedback" class="captcha-error"></div>
    </div>
</div>
```

**KEY POINTS:**
- ✅ Include `captcha-warning` div with ID `your-captcha-warning`
- ✅ Include timer display: `<span id="your-timer">15</span>s`
- ✅ Use `captcha-error` class for feedback div
- ✅ Use `btn-primary btn-large` for main action button
- ✅ Use `btn-secondary` for cancel button

#### 3. Add CSS Styles
**Location:** `styles.css` (after previous CAPTCHA styles)

**Pattern:**
```css
/* Your CAPTCHA */
#your-captcha-modal .modal-content {
    max-width: 550px;
}

.your-game-container {
    margin: 20px 0;
    text-align: center;
}

#your-canvas {
    display: block;
    margin: 0 auto 15px;
    background: #color;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Additional styles for controls, sliders, etc. */
```

#### 4. Register in main.js
**Location:** `js/main.js`

**Add import:**
```javascript
import { showCAPTCHA as showYourCaptcha } from './captcha/yourCaptcha.js';
```

**Add window export:**
```javascript
// Your CAPTCHA
window.showYourCaptcha = showYourCaptcha;
```

#### 5. Add to Checkout Rotation
**Location:** `js/checkout.js` in `initiateCheckout()` function

**Update the random selection:**
```javascript
// Update total count in comment
// Randomly choose between all CAPTCHA types (8 total)
const captchaType = Math.random();
if (captchaType < 0.125) {
    if (window.showCaptcha) window.showCaptcha();
} else if (captchaType < 0.25) {
    if (window.showGasPumpCaptcha) window.showGasPumpCaptcha();
// ... existing CAPTCHAs
} else {
    if (window.showYourCaptcha) window.showYourCaptcha();
}
```

**Note:** Adjust thresholds to maintain equal distribution (1/N for N total CAPTCHAs)

#### 6. Add to Debug Panel
**Location:** `index.html` - add button to debug panel

```html
<button id="debug-your-captcha" class="debug-btn">Your CAPTCHA Name</button>
```

**Location:** `js/ui.js` in `setupDebugPanel()` function

```javascript
const debugYourCaptcha = document.getElementById('debug-your-captcha');
if (debugYourCaptcha) {
    debugYourCaptcha.addEventListener('click', () => {
        if (gameState.isRunning && window.showYourCaptcha) {
            window.showYourCaptcha();
        }
    });
}
```

#### 7. Update CLAUDE.md
Add your CAPTCHA to the "Individual CAPTCHA Mechanics" section with details about mechanics, timer, and what it tests.

### Common CAPTCHA Implementation Mistakes to Avoid

1. ❌ **Adding callback parameters** to `showCAPTCHA(onSuccess, onCancel)`
   - ✅ Use `showCAPTCHA()` with no parameters
   - ✅ Call `window.completeCheckout()` directly on success

2. ❌ **Reusing the global `gameState` variable** for CAPTCHA-specific state
   - ✅ Create a local state variable (e.g., `tanksCaptchaState`)
   - ✅ Only import `gameState` to check `gameState.isMultiplayer`

3. ❌ **Forgetting to clean up event listeners**
   - ✅ Remove ALL event listeners in `cleanup()`
   - ✅ Use `cancelAnimationFrame()` for RAF loops
   - ✅ Clear all `setInterval()` and `setTimeout()`

4. ❌ **Not including multiplayer warning check**
   - ✅ Always check `gameState.isMultiplayer && hasOverlappingSeats()`
   - ✅ Show/hide the warning element accordingly

5. ❌ **Forgetting to update checkout probability thresholds**
   - ✅ Recalculate thresholds: 1/N for N total CAPTCHAs
   - ✅ Update the comment showing total count

6. ❌ **Not testing in debug mode**
   - ✅ Always add to debug panel
   - ✅ Test independently before testing in full game

7. ❌ **Canvas state not isolated**
   - ✅ Each CAPTCHA should have its own local state
   - ✅ Don't share state between different CAPTCHA types

### CAPTCHA Design Principles

- **Variety:** Each CAPTCHA should test different skills (reflexes, precision, timing, physics, strategy)
- **Difficulty Balance:** Should be challenging but not frustrating (60-80% success rate ideal)
- **Timer Length:** 10-20 seconds depending on complexity
- **Visual Feedback:** Always show clear success/failure messages
- **Mobile Support:** Use large buttons and touch-friendly controls
- **Canvas Usage:** Good for physics-based or visual CAPTCHAs
- **Frustration Factor:** Should simulate real CAPTCHA annoyance while being fun

## Multiplayer Competitive Mechanics

**Design Decision: Competitive Seat Selection**
- Both players can add the same seats to their carts simultaneously
- **No visual feedback** until CAPTCHA - keeps competition suspenseful and realistic
- **CAPTCHA always appears** when both players have overlapping seats (guarantees fair competition)
- CAPTCHA warning displays when both players have overlapping seats (only hint of competition)
- First player to complete CAPTCHA wins the contested seats
- Loser's purchase attempt fails (seats already claimed)
- Creates authentic Ticketmaster rush experience with surprise competition
