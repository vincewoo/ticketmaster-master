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

### File Structure
- `index.html` - Main game structure with modals (start, multiplayer setup, host/join, CAPTCHA, game over)
- `styles.css` - Complete styling with responsive design and color-coded pricing
- `game.js` - All game logic, state management, and multiplayer synchronization

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
   - Seats must be adjacent (side-by-side) in the same row
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

4. **CAPTCHA System**:
   - 60% chance on checkout (100% if competing with opponent for same seats)
   - 10-second countdown
   - 6-character alphanumeric codes (no confusing characters)
   - Warning shown if opponent is competing for same seats

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

## Key Patterns and Conventions

- Pure vanilla JS - no frameworks (except PeerJS for multiplayer)
- Event-driven architecture using `addEventListener`
- Interval-based game loop for timer and dynamic updates (host-driven in multiplayer)
- CSS Grid for seat layout (12x8 grid = 96 seats)
- Modal system for overlays (start, multiplayer setup, CAPTCHA, game over)
- Responsive design with mobile support
- Host-authoritative multiplayer (no client-side prediction)

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

### Technical Decisions

7. **Host-Authoritative Multiplayer** (Most Important)
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

8. **PeerJS for Multiplayer**
   - **Why:** Simple WebRTC abstraction without server requirements
   - **Architecture:** Direct peer-to-peer connection
   - **Benefits:** No backend needed, low latency
   - **Trade-offs:** Requires both players to have good network connectivity

## Common Pitfalls & Gotchas

1. **Don't Use Math.random() in Multiplayer Mode**
   - Host generates all randomness and broadcasts to guest
   - Using Math.random() on guest causes desync

2. **Cart Seat Protection in Multiplayer**
   - When host updates seat availability or prices, it must check `opponentCart` array
   - Seats in opponent's cart are protected from changes (prevents CAPTCHA issues)
   - This prevents seats from disappearing or changing price while opponent is purchasing
   - **Both players can select the same seats**: Whoever completes CAPTCHA first wins the seats
   - **No visual indicator** for opponent's cart - keeps competition suspenseful until CAPTCHA warning

3. **Adjacent Seat Validation**
   - Seats must be side-by-side in same row (not diagonal, not vertical)
   - Validation checks row match and consecutive column numbers

4. **Price Color Calculation**
   - Based on percentage discount: `((basePrice - currentPrice) / basePrice) * 100`
   - Positive = discount (green), negative = premium (red)

5. **Cache Busting**
   - game.js loaded with version parameter: `game.js?v=13`
   - Increment version when updating game.js to force browser reload

## Multiplayer Competitive Mechanics

**Design Decision: Competitive Seat Selection**
- Both players can add the same seats to their carts simultaneously
- **No visual feedback** until CAPTCHA - keeps competition suspenseful and realistic
- **CAPTCHA always appears** when both players have overlapping seats (guarantees fair competition)
- CAPTCHA warning displays when both players have overlapping seats (only hint of competition)
- First player to complete CAPTCHA wins the contested seats
- Loser's purchase attempt fails (seats already claimed)
- Creates authentic Ticketmaster rush experience with surprise competition
