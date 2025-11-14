# Game Modules API Reference

Complete reference for all exported functions organized by module.

## Module: gameFlow.js
**File:** `/home/vince/workspace/ticket-sim/js/gameFlow.js`
**Size:** 22 KB
**Purpose:** Core game flow, initialization, and game loop management

### Exported Functions

#### `initGame()`
Initializes the game on page load.
- Sets up responsive grid layout based on screen size
- Generates seats
- Renders seats on board
- Attaches event listeners
- **Called on:** DOMContentLoaded

#### `startGame()`
Starts a new game round.
- Hides modals (start, host, join)
- Resets game state
- Generates target ticket count
- Generates random event times
- Displays opponent score if multiplayer
- Generates initial seats
- Starts main game timer (updateTimer every 1s)
- **Parameters:** None
- **Returns:** void

#### `updateTimer()`
Main game loop - called every 1 second.
- Decrements time remaining
- Checks for price event activations (sale/surge)
- Updates display
- Updates seat availability every 2 seconds
- Updates seat prices every 3 seconds
- Calls endGame() when time expires
- **Parameters:** None
- **Returns:** void

#### `updateDisplay()`
Updates UI displays on each timer tick.
- Updates timer (MM:SS format)
- Updates score display
- Updates target ticket count
- Updates opponent score if multiplayer
- **Parameters:** None
- **Returns:** void

#### `updateEventDisplay()`
Shows/hides event banner (Flash Sale or Surge Pricing).
- Creates banner if doesn't exist
- Shows appropriate event message
- Hides when no event active
- **Parameters:** None
- **Returns:** void

#### `showLoadingScreen(callback)`
Shows queue waiting animation before game starts.
- Simulates 3-second wait
- Animates fan count countdown
- Shows "Ready!" message at 50%
- Calls callback when complete
- **Parameters:** 
  - `callback` {Function} - Function to call on completion
- **Returns:** void

#### `endGame()`
Ends game and displays final stats.
- Stops game loop
- Notifies opponent in multiplayer
- Displays final score
- Displays ticket count
- Displays total savings
- Displays skip penalties
- Generates purchase history with:
  - Individual seat details
  - Savings/premiums per seat
  - Purchase totals
  - Sorted by row and column
- **Parameters:** None
- **Returns:** void

#### `setupEventListeners()`
Attaches all UI event listeners.
- Multiplayer setup
- Window resize handler
- Checkout button
- Skip button
- CAPTCHA buttons (all types)
- CAPTCHA input Enter key
- Gas pump stop button
- Puzzle slider input
- Fishing action button
- Debug panel setup
- Play again button
- **Parameters:** None
- **Returns:** void

#### `showModal(modalId)`
Shows a modal dialog.
- **Parameters:** 
  - `modalId` {string} - ID of modal element to show
- **Returns:** void

#### `hideModal(modalId)`
Hides a modal dialog.
- **Parameters:** 
  - `modalId` {string} - ID of modal element to hide
- **Returns:** void

---

## Module: multiplayer.js
**File:** `/home/vince/workspace/ticket-sim/js/multiplayer.js`
**Size:** 13 KB
**Purpose:** Multiplayer mode setup and PeerJS networking

### Exported Functions

#### `initMultiplayer()`
Sets up multiplayer UI event listeners.
- Single-player button listener
- Multiplayer button listener
- Back to start button
- Host game button
- Join game button
- Cancel host button
- Cancel join button
- Connect button
- Copy code button
- **Parameters:** None
- **Returns:** void

#### `hostGame()`
Creates PeerJS peer and waits for guest connection.
- Shows host modal
- Sets multiplayer=true, isHost=true
- Creates new Peer instance
- Sets up 'open' listener to display game code
- Sets up 'connection' listener for incoming connections
- Sends init message with grid config to guest
- Starts loading screen and game after 1s
- Sets up error handling
- **Parameters:** None
- **Returns:** void

#### `joinGame()`
Connects to host using game code.
- Gets game code from input
- Validates code exists
- Sets multiplayer=true, isHost=false
- Creates new Peer instance
- Connects to host peer
- Sends screen size to host
- Shows loading screen and starts game
- Sets up error handling
- **Parameters:** None
- **Returns:** void

#### `setupConnection(conn)`
Sets up PeerJS connection event handlers.
- 'data' listener: handles incoming messages
- 'close' listener: alerts on disconnect, ends game if running
- **Parameters:** 
  - `conn` {Object} - PeerJS connection object
- **Returns:** void

#### `handleMultiplayerMessage(data)`
Processes messages from opponent.
- **Supported message types:**
  - `init` - Host connection setup
  - `screenSize` - Guest screen size
  - `gridLayoutSync` - Confirm grid config
  - `initialState` - Initial seat availability
  - `targetUpdate` - New target count
  - `eventTimes` - Event timing
  - `availabilityUpdate` - Seat changes
  - `priceUpdate` - Price changes
  - `cartUpdate` - Opponent's cart
  - `seatClaimed` - Opponent purchased
  - `scoreUpdate` - Opponent score
  - `gameEnd` - Game over
- **Parameters:** 
  - `data` {Object} - Message object with type and payload
- **Returns:** void

#### `sendMultiplayerMessage(data)`
Sends message to opponent.
- Checks connection is open
- Sends data via PeerJS connection
- **Parameters:** 
  - `data` {Object} - Message to send (must have 'type' property)
- **Returns:** void

#### `copyGameCode()`
Copies host game code to clipboard.
- Selects code input
- Executes copy command
- Shows "Copied!" feedback
- Reverts text after 2s
- **Parameters:** None
- **Returns:** void

#### `cancelHost()`
Cancels hosting and cleans up.
- Destroys Peer instance
- Resets multiplayer state
- Hides host modal
- Shows multiplayer modal
- **Parameters:** None
- **Returns:** void

#### `cancelJoin()`
Cancels joining and cleans up.
- Destroys Peer instance
- Resets multiplayer state
- Hides join modal
- Shows multiplayer modal
- **Parameters:** None
- **Returns:** void

---

## Module: ui.js
**File:** `/home/vince/workspace/ticket-sim/js/ui.js`
**Size:** 2.1 KB
**Purpose:** UI utilities and debug panel management

### Exported Functions

#### `setupDebugPanel()`
Initializes debug panel with CAPTCHA test buttons.
- Backtick (`) key toggles debug panel (when game running)
- Close button hides panel
- Text CAPTCHA button shows text CAPTCHA
- Gas pump button shows gas pump CAPTCHA
- Puzzle button shows puzzle CAPTCHA
- Fishing button shows fishing CAPTCHA
- **Parameters:** None
- **Returns:** void

---

## Module: main.js
**File:** `/home/vince/workspace/ticket-sim/js/main.js`
**Size:** 4.1 KB
**Purpose:** Central entry point - imports all modules and exports to window

### Imports (15+ modules)
- gameState.js
- config.js
- seatManagement.js
- cartManagement.js
- checkout.js
- gameFlow.js
- multiplayer.js
- ui.js
- captcha/textCaptcha.js
- captcha/gasPumpCaptcha.js
- captcha/puzzleCaptcha.js
- captcha/fishingCaptcha.js

### Window Exports (54 total)

#### Game Flow (10)
- initGame
- startGame
- updateTimer
- updateDisplay
- updateEventDisplay
- endGame
- showLoadingScreen
- setupEventListeners
- showModal
- hideModal

#### Seat Management (5)
- generateSeats
- renderSeats
- updateSeatAvailability
- updateSeatPrices
- getPriceColor

#### Cart Management (5)
- handleSeatClick
- removeSeatFromCart
- updateCart
- areSeatsAdjacent
- hasOverlappingSeats

#### Checkout (5)
- generateTargetTicketCount
- generateEventTimes
- initiateCheckout
- completeCheckout
- skipTarget

#### Multiplayer (9)
- initMultiplayer
- hostGame
- joinGame
- setupConnection
- handleMultiplayerMessage
- sendMultiplayerMessage
- copyGameCode
- cancelHost
- cancelJoin

#### Text CAPTCHA (3)
- showCaptcha
- verifyCaptcha
- cancelCaptcha

#### Gas Pump CAPTCHA (4)
- showGasPumpCaptcha
- startGasPump
- stopGasPump
- cancelGasCaptcha

#### Puzzle CAPTCHA (5)
- showPuzzleCaptcha
- generatePuzzle
- updatePuzzlePiecePosition
- verifyPuzzle
- cancelPuzzleCaptcha

#### Fishing CAPTCHA (5)
- showFishingCaptcha
- startFishingGame
- stopFishingGame
- startFishingAction
- stopFishingAction
- cancelFishingCaptcha

#### UI (1)
- setupDebugPanel

#### Debug (1)
- gameState (entire object)

---

## Existing Modules (Not Modified)

### config.js
- GAME_DURATION
- CAPTCHA_DURATION
- FISHING_CAPTCHA_DURATION
- SEAT_ROWS, SEAT_COLS, TOTAL_SEATS
- SKIP_PENALTY
- PRICE_TIERS
- getGridConfig()
- applyGridLayout()

### gameState.js
- gameState object
- resetGameState()
- resetMultiplayerState()

### seatManagement.js
- generateSeats()
- calculateSeatPrice()
- getPriceColor()
- renderSeats()
- updateSeatAvailability()
- updateSeatPrices()

### cartManagement.js
- areSeatsAdjacent()
- hasOverlappingSeats()
- handleSeatClick()
- removeSeatFromCart()
- updateCart()

### checkout.js
- generateTargetTicketCount()
- generateEventTimes()
- initiateCheckout()
- completeCheckout()
- skipTarget()

### CAPTCHA Modules (captcha/)
- textCaptcha.js: showCaptcha, generateCaptchaCode, updateCaptchaTimer, verifyCaptcha, showCaptchaError, cancelCaptcha
- gasPumpCaptcha.js: showGasPumpCaptcha, startGasPump, stopGasPump, showGasCaptchaError, cancelGasCaptcha
- puzzleCaptcha.js: showPuzzleCaptcha, generatePuzzle, drawJigsawPiece, updatePuzzleTimer, updatePuzzlePiecePosition, verifyPuzzle, showPuzzleCaptchaError, cancelPuzzleCaptcha
- fishingCaptcha.js: showFishingCaptcha, startFishingGame, stopFishingGame, drawFishingGame, updateFishingProgressBar, updateFishingTimer, startFishingAction, stopFishingAction, cancelFishingCaptcha, showFishingCaptchaError

---

## Usage in HTML

All functions are accessed via the global window namespace:

```html
<!-- Start game -->
<button onclick="startGame()">Start Game</button>

<!-- Multiplayer -->
<button onclick="hostGame()">Host Game</button>
<button onclick="joinGame()">Join Game</button>

<!-- Cart actions -->
<button onclick="removeSeatFromCart('A1')">Remove</button>
<button onclick="initiateCheckout()">Checkout</button>

<!-- Debug -->
<button onclick="showCaptcha()">Test CAPTCHA</button>
<button onclick="setupDebugPanel()">Show Debug Panel</button>
```

---

## State Management

Access global game state for debugging:

```javascript
// In browser console:
window.gameState           // Access entire state
window.gameState.score     // Current score
window.gameState.cart      // Selected seats
window.gameState.timeRemaining  // Time left
```

---

## Module Dependencies Diagram

```
main.js
├── gameFlow.js
│   ├── gameState.js
│   ├── config.js
│   ├── seatManagement.js
│   ├── cartManagement.js
│   └── checkout.js
├── multiplayer.js
│   ├── gameState.js
│   ├── config.js
│   ├── seatManagement.js
│   └── gameFlow.js
├── ui.js
│   └── gameState.js
├── seatManagement.js
│   ├── gameState.js
│   └── config.js
├── cartManagement.js
│   ├── gameState.js
│   └── seatManagement.js
├── checkout.js
│   ├── gameState.js
│   ├── config.js
│   ├── cartManagement.js
│   └── seatManagement.js
└── captcha/
    ├── textCaptcha.js
    ├── gasPumpCaptcha.js
    ├── puzzleCaptcha.js
    └── fishingCaptcha.js
```

---

## Notes

- All modules use ES6 import/export syntax
- Functions exported to window for HTML compatibility
- No circular dependencies
- Host-authoritative multiplayer prevents sync issues
- All existing functionality preserved
- Original game.js remains as reference but unused
