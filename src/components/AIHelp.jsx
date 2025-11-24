export default function AIHelp() {

  const content = `ARCHEUM SDK - AI INTEGRATION GUIDE
==========================================

This guide provides context and tools for AI assistants helping developers build mobile applications using the Archeum SDK.

CRITICAL REQUIREMENT: MOBILE-ONLY APPLICATIONS
-----------------------------------------------
Archeum SDK is designed exclusively for mobile applications. Desktop and web applications are NOT supported. This is a hard architectural requirement. When helping developers, always emphasize that their application must be mobile-only (iOS/Android/React Native/Flutter/etc.).

SDK LANGUAGE BINDINGS
---------------------
Assume that language bindings exist for common mobile development languages. The API patterns described below apply across all language bindings, with language-specific syntax differences.

PROVISIONING CONTEXT
-------------------
IMPORTANT: Normal mobile applications do NOT provision nodes. Node provisioning is ONLY done by the Archeum app itself.

Mobile apps built with the SDK connect to existing Archeum nodes that are already provisioned and running. Users do not need to provision anything - they simply connect to nodes using their wallet credentials.

For development/testing purposes only, provisioning can be done via:
- HTTP API (dev mode only)
- BLE (Bluetooth Low Energy)

Do NOT include provisioning details in general SDK usage guides unless specifically for development/testing scenarios.

SDK ARCHITECTURE OVERVIEW
-------------------------
The Archeum SDK provides three core primitives that form the foundation of all application data structures:

1. IDENTITY - Represents a user by their handle
2. ITEM - Data storage primitive (key-value storage)
3. REACTOR - Collaborative data structures (social features)

All application-specific objects are built by composing these primitives using inheritance/composition patterns.

CORE PRIMITIVES
--------------

IDENTITY
--------
Represents a user by their handle (e.g., "alice", "bob").

Constructor:
  Identity.new(handle: string) -> Identity

Methods:
  handle() -> string
    Returns the handle string

  item(name: string) -> Item
    Creates an Item owned by this identity

  reactor(name: string, type: ReactorType) -> Reactor
    Creates a Reactor owned by this identity

Example:
  owner = Identity.new("alice")
  profile_item = owner.item("profile")
  followers = owner.reactor("followers", ReactorType.HandleSet)


ITEM
----
Data storage primitive. Stores arbitrary binary data with optional end-to-end encryption.

Constructor:
  Item.new(owner: Identity, name: string) -> Item

Core Operations:
  get() -> Future<Vec<u8>>
    Retrieves raw bytes from storage

  put(data: Vec<u8>, is_public: bool) -> Future<Result>
    Stores data. If is_public=false, data is encrypted for owner only.
    If is_public=true, data is stored unencrypted.

  delete() -> Future<Result>
    Deletes the item and all its data

String Helpers:
  get_string() -> Future<String>
    Retrieves and decodes as UTF-8 string

  put_string(s: string, is_public: bool) -> Future<Result>
    Stores string as UTF-8 bytes

JSON Helpers:
  get_map<K, V>() -> Future<HashMap<K, V>>
    Retrieves and deserializes as JSON object/map

  put_map<K, V>(map: HashMap<K, V>, is_public: bool) -> Future<Result>
    Serializes map to JSON and stores

  get_list<T>() -> Future<Vec<T>>
    Retrieves and deserializes as JSON array

  put_list<T>(list: Vec<T>, is_public: bool) -> Future<Result>
    Serializes list to JSON and stores

Nesting:
  property(name: string) -> Item
    Creates a nested item with name "{item_name}-{name}"

  reactor(name: string, type: ReactorType) -> Reactor
    Creates a nested reactor with name "{item_name}-{name}"

Encryption:
  for_handles(handles: Vec<string>) -> Item
    Configures item to encrypt for specific handles (in addition to owner)
    Note: Cannot be used with is_public=true

Example:
  item = owner.item("profile")
  await item.put_string("Software Engineer", true)
  bio = await item.get_string()

  nested = item.property("settings")
  await nested.put_map({"theme": "dark"}, false)


REACTOR
-------
Collaborative data structures for social features. Three types:

1. HandleSet - Set of handles (for likes, follows, attendees)
2. FirstCall - Handle->data map, first write wins (for RSVPs, poll votes)
3. LastCall - Handle->data map, last write wins (for status, location)

Constructor:
  Reactor.new(owner: Identity, name: string, type: ReactorType) -> Reactor

Methods:
  start(initial_data: Option<Vec<u8>>) -> Future<Result>
    Creates/initializes the reactor (idempotent)

  react(data: Option<Vec<u8>>) -> Future<Result>
    Adds/updates current user's reaction
    - HandleSet: data is ignored, just adds handle to set
    - FirstCall: stores data if user hasn't reacted yet
    - LastCall: always updates with latest data

  unreact() -> Future<Result>
    Removes current user's reaction from reactor

  get() -> Future<Vec<u8>>
    Retrieves reactor state (inherited from ItemBase)
    Returns JSON representation of reactor data

Reactor also implements ItemBase, so you can use:
  get_map() / put_map() for JSON operations
  property() / reactor() for nesting

Example:
  likes = owner.reactor("post-123-likes", ReactorType.HandleSet)
  await likes.start()
  await likes.react(None)  // Like the post

  rsvp = owner.reactor("party-rsvp", ReactorType.FirstCall)
  await rsvp.start()
  await rsvp.react(b"yes")  // RSVP with "yes"


BUILDING APPLICATION OBJECTS
-----------------------------
The SDK uses composition and inheritance patterns to build application-specific types.

PATTERN 1: Identity-Based Objects
----------------------------------
For objects that represent a user's profile or identity:

1. Store Identity as a field named "owner"
2. Use #[derive(IsIdentity)] macro (or equivalent in your language)
3. This automatically implements Deref to Identity, giving access to:
   - handle() method
   - item() and reactor() methods

Example (Rust-like pseudocode):
  struct Profile {
    owner: Identity,
    bio: Item,
    posts: Item,
    followers: Reactor,
  }

  impl Profile {
    fn new(handle: string) -> Self {
      let owner = Identity.new(handle)
      Self {
        owner: owner,
        bio: owner.item("bio"),
        posts: owner.item("posts"),
        followers: owner.reactor("followers", ReactorType.HandleSet),
      }
    }
  }

  // Usage:
  profile = Profile.new("alice")
  await profile.bio.put_string("Software Engineer", true)
  handle = profile.handle()  // Access via deref to Identity


PATTERN 2: Item-Based Objects
------------------------------
For objects that represent data items (posts, messages, etc.):

1. Store Item as a field named "base"
2. Use #[derive(IsItem)] macro (or equivalent)
3. This automatically implements Deref to Item, giving access to:
   - All Item methods (get, put, delete, etc.)
   - property() and reactor() for nesting

Example:
  struct Post {
    base: Item,
    likes: Reactor,
    comments: Item,
  }

  impl Post {
    fn new(profile: &Profile, id: string) -> Self {
      let base = profile.item(&format("post-{}", id))
      Self {
        base: base,
        likes: base.reactor("likes", ReactorType.HandleSet),
        comments: base.property("comments"),
      }
    }

    async fn like(&self) -> Result {
      await self.likes.react(None)
    }
  }

  // Usage:
  post = Post.new(&profile, "123")
  await post.put_string("My first post!", true)  // Access via deref to Item
  await post.like()


PATTERN 3: Nested Composition
------------------------------
Items and Reactors can be nested using property() and reactor():

  post = profile.item("post-123")
  await post.put_string("Content", true)

  likes = post.reactor("likes", ReactorType.HandleSet)
  await likes.start()

  comments = post.property("comments")
  await comments.put_list([...], true)


GLOBAL SDK API
--------------
The SDK provides a global Archeum object for static operations:

Initialization:
  Archeum.set_namespace(namespace: string)
    Must be called once before any operations
    Namespace identifies your app (e.g., "com.myapp")

  Archeum.sign_in(handle: string, wallet: Wallet) -> Future<Result>
    Authenticates user for all subsequent operations
    Wallet contains private key for signing

Static Operations:
  Archeum.get(handle: string, item: string) -> Future<Vec<u8>>
    Read any handle's data (reads are public)

  Archeum.put(handle: string, item: string, data: Vec<u8>,
              is_public: bool, for_handles: Option<Vec<string>>) -> Future<Result>
    Write to your own handle only (writes are owner-only)

  Archeum.delete(handle: string, item: string) -> Future<Result>
    Delete your own handle's data

  Archeum.react(handle: string, reactor: string, data: Option<Vec<u8>>) -> Future<Result>
    React to any handle's reactor

  Archeum.start_reactor(handle: string, reactor: string,
                        type: string, initial_data: Option<Vec<u8>>) -> Future<Result>
    Create reactor on your own handle

  Archeum.unreact(handle: string, reactor: string) -> Future<Result>
    Remove your reaction

Pub/Sub:
  Archeum.publish(handle: string, stream: string,
                   data: Vec<u8>, record: bool) -> Future<PublishStream>
    Start publishing to a stream (owner-only)

  Archeum.subscribe(handle: string, stream: string) -> Future<SubscribeStream>
    Subscribe to any handle's stream

  PublishStream.send_chunk(data: Vec<u8>) -> Future<Result>
    Send chunk to all subscribers

  SubscribeStream.recv_chunk() -> Future<Option<Vec<u8>>>
    Receive next chunk (returns None when stream ends)


AUTHENTICATION & AUTHORIZATION
-------------------------------
- All operations require sign_in() first
- Reads are technically public: any authenticated user can attempt to read any handle's data. However, encrypted data can only be read by those with the decryption key. This is why end-to-end encryption is included in the protocol - it ensures that even though reads are public at the protocol level, encrypted data remains private.
- Writes are owner-only: you can only write to your own handle
- Reactors: anyone can react, but only owner can create them
- Pub/Sub: anyone can subscribe, but only owner can publish

ENCRYPTION MODEL
----------------
- Default: Data encrypted for owner only (is_public=false, no for_handles)
- Public: Data stored unencrypted (is_public=true)
- Multi-recipient: Encrypt for specific handles (is_public=false, for_handles=[...])
- Owner is always included as recipient automatically
- Cannot combine is_public=true with for_handles

Encryption uses ECIES encryption with secp256k1 wallet public keys (same as Ethereum). For multi-recipient encryption, each recipient gets an encrypted copy of the symmetric key.

REACTOR TYPES DETAILED
-----------------------
HandleSet:
  - Stores set of handles that reacted
  - Data parameter in react() is ignored
  - Use for: likes, follows, attendees, members

FirstCall:
  - Stores handle->data mapping
  - First reaction per handle wins (subsequent reactions ignored)
  - Use for: RSVPs, poll votes, one-time commitments

LastCall:
  - Stores handle->data mapping
  - Last reaction per handle wins (overwrites previous)
  - Use for: status updates, location tracking, preferences

NESTING PATTERNS
----------------
Items can nest other items and reactors:

  profile = owner.item("profile")
  settings = profile.property("settings")  // Creates "profile-settings"
  theme = settings.property("theme")        // Creates "profile-settings-theme"

  post = owner.item("post-123")
  likes = post.reactor("likes", ReactorType.HandleSet)  // Creates "post-123-likes"
  comments = post.property("comments")                  // Creates "post-123-comments"

Naming convention: "{parent_name}-{child_name}"

COMMON PATTERNS
---------------

Social Media App:
  Profile (Identity-based):
    - bio: Item
    - avatar: Item
    - posts: Item (list of post IDs)
    - followers: Reactor (HandleSet)
    - following: Reactor (HandleSet)

  Post (Item-based):
    - base: Item (content)
    - likes: Reactor (HandleSet)
    - comments: Item (list)
    - shares: Reactor (HandleSet)

Messaging App:
  Conversation (Item-based):
    - base: Item (metadata)
    - messages: Item (list)
    - participants: Reactor (HandleSet)
    - read_receipts: Reactor (LastCall)

Location Tracking:
  User (Identity-based):
    - current_location: Reactor (LastCall)
    - location_history: Item (list)

Event App:
  Event (Item-based):
    - base: Item (event details)
    - rsvps: Reactor (FirstCall)
    - attendees: Reactor (HandleSet)
    - checkins: Reactor (LastCall)

ERROR HANDLING
--------------
All async operations return Result<T, ArcheumError>:

Common errors:
  - NotSignedIn: Must call sign_in() first
  - Unauthorized: Cannot write to another user's data
  - ConnectionError: Network/node connection failed
  - ServerError: Server-side error (item not found, etc.)
  - InvalidData: Invalid encryption parameters or data format

Always handle errors appropriately in mobile apps.

CONNECTION MANAGEMENT
---------------------
- SDK manages connection pooling automatically
- Connections are cached and reused (LRU eviction)
- No manual connection management needed
- Connections are authenticated per handle

REGISTRY & HANDLE RESOLUTION
----------------------------
- Handles are registered on-chain (Base L2 mainnet)
- SDK automatically resolves handles to node endpoints
- Public keys are stored on-chain for encryption
- Handle lookup is transparent to application code

For development/testing, you can cache handles locally:
  cache_handle(handle: string, address: string, endpoint: string, pubkey: string) -> Future<Result>
    Bypasses blockchain lookup for faster development

BEST PRACTICES FOR AI ASSISTANTS
--------------------------------
1. Always emphasize mobile-only requirement
2. Focus on composition patterns (Identity + Item + Reactor)
3. Show how to build domain objects using primitives
4. Explain inheritance/deref patterns for code reuse
5. Demonstrate nesting for complex data structures
6. Use appropriate Reactor types for social features
7. Handle errors gracefully in async operations
8. Remember: only the Archeum app provisions nodes - normal mobile apps never provision nodes
9. Encryption is automatic (default: owner-only)
10. Reads are public, writes are owner-only

EXAMPLE: SOCIAL APP STRUCTURE
-------------------------------
// Pseudocode - adapt to your language

// 1. Identity-based Profile
struct Profile {
  owner: Identity,
  bio: Item,
  avatar: Item,
  posts: Item,
  followers: Reactor,
  following: Reactor,
}

impl Profile {
  fn new(handle: string) -> Self {
    let owner = Identity.new(handle)
    Self {
      owner: owner,
      bio: owner.item("bio"),
      avatar: owner.item("avatar"),
      posts: owner.item("posts"),
      followers: owner.reactor("followers", ReactorType.HandleSet),
      following: owner.reactor("following", ReactorType.HandleSet),
    }
  }
}

// 2. Item-based Post
struct Post {
  base: Item,
  likes: Reactor,
  comments: Item,
}

impl Post {
  fn new(profile: &Profile, id: string) -> Self {
    let base = profile.item(&format("post-{}", id))
    Self {
      base: base,
      likes: base.reactor("likes", ReactorType.HandleSet),
      comments: base.property("comments"),
    }
  }
}

This pattern scales to any application domain by composing Identity, Item, and Reactor primitives.

END OF GUIDE
============
`

  return (
    <pre style={{
      padding: '2rem',
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      lineHeight: '1.6',
      color: '#e0e0e0',
      background: '#1a1a1a',
      minHeight: '100vh',
      maxWidth: '100%',
      overflow: 'auto'
    }}>
      {content}
    </pre>
  )
}

