const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// ─── Fallback keyword-based AI engine ──────────────────────────────────────

const TECH_QUESTIONS = {
  javascript: [
    { question: "Explain the difference between let, const, and var in JavaScript.", intention: "Assess understanding of variable scoping and hoisting.", answer: "var is function-scoped and hoisted with undefined initialization. let is block-scoped and hoisted but uninitialized (temporal dead zone). const is block-scoped like let but cannot be reassigned. Modern best practice is to use const by default and let when reassignment is needed." },
    { question: "What are closures in JavaScript? Provide a practical example.", intention: "Evaluate knowledge of lexical scoping and function behavior.", answer: "A closure is a function that has access to its outer function scope even after the outer function has returned. Example: a counter function that returns an inner function which increments a private variable. Closures are used in data privacy, event handlers, and functional programming patterns." },
    { question: "Explain event delegation and why it's useful.", intention: "Test DOM manipulation optimization knowledge.", answer: "Event delegation uses event bubbling to handle events at a parent element instead of attaching listeners to each child. This improves performance, reduces memory usage, and handles dynamically added elements automatically." },
    { question: "What is the event loop in JavaScript? How does it handle asynchronous operations?", intention: "Assess understanding of JavaScript concurrency model.", answer: "The event loop continuously checks the call stack and callback queue. When the stack is empty, it pushes callbacks from the queue onto the stack. Promises use microtask queue (higher priority) while setTimeout uses macrotask queue." }
  ],
  python: [
    { question: "Explain the difference between lists and tuples in Python.", intention: "Assess knowledge of Python data structures.", answer: "Lists are mutable, defined with [], and support modification. Tuples are immutable, defined with (), and cannot be changed after creation. Tuples are faster and can be used as dictionary keys. Use lists for collections that change, tuples for fixed data." },
    { question: "What are decorators in Python? How do you create one?", intention: "Evaluate understanding of Python metaprogramming.", answer: "Decorators are functions that modify the behavior of other functions. Created using @decorator syntax. They take a function as argument, add functionality, and return a new function. Common uses include logging, authentication, and timing." },
    { question: "Explain how Python handles memory management.", intention: "Test understanding of Python internals.", answer: "Python uses reference counting as primary mechanism with a garbage collector for cyclic references. Objects are allocated in private heap space. Memory management is automatic but can be influenced using __slots__, weakref, and context managers." },
    { question: "What is the Global Interpreter Lock (GIL) and how does it affect multithreading?", intention: "Assess knowledge of Python concurrency limitations.", answer: "GIL is a mutex that allows only one thread to execute Python bytecodes at a time. It simplifies CPython implementation but limits true parallelism in CPU-bound tasks. Workarounds include multiprocessing, async/await, or using C extensions." }
  ],
  react: [
    { question: "Explain the Virtual DOM and how React uses it for performance.", intention: "Assess understanding of React's rendering optimization.", answer: "Virtual DOM is a lightweight JavaScript representation of the real DOM. React creates a new VDOM tree on each render, diffs it with the previous tree, and applies minimal updates to the real DOM. This batching of changes improves performance significantly." },
    { question: "What are React hooks? Explain useEffect and useState.", intention: "Evaluate knowledge of modern React patterns.", answer: "Hooks are functions that let you use state and lifecycle features in functional components. useState manages component state. useEffect handles side effects (data fetching, subscriptions, DOM manipulation) with dependency array control." },
    { question: "How does React handle state management in large applications?", intention: "Test architectural knowledge of React apps.", answer: "For large apps, use Context API for global state, Redux/Zustand for complex state logic, or React Query for server state. Component composition, custom hooks, and state normalization are key patterns." },
    { question: "Explain React reconciliation and the key prop.", intention: "Assess deep understanding of React rendering.", answer: "Reconciliation is React's diffing algorithm that compares VDOM trees. The key prop helps React identify which items changed, were added, or removed in lists. Using stable, unique keys (not array index) ensures correct component identity and prevents bugs." }
  ],
  node: [
    { question: "How does Node.js handle concurrency with its single-threaded model?", intention: "Assess understanding of Node.js architecture.", answer: "Node.js uses an event-driven, non-blocking I/O model. While JavaScript runs on a single thread, I/O operations are delegated to the system (libuv) which uses a thread pool. The event loop processes callbacks when operations complete." },
    { question: "Explain middleware in Express.js and its use cases.", intention: "Evaluate Express.js framework knowledge.", answer: "Middleware functions have access to req, res, and next(). They can modify requests/responses, end the cycle, or call next middleware. Uses: authentication, logging, error handling, parsing, CORS, validation." },
    { question: "How do you handle errors in a Node.js application?", intention: "Test production-ready error handling practices.", answer: "Use try-catch for sync code, .catch() for promises, and express error-handling middleware (4-param function). Implement centralized error handling, custom error classes, and proper HTTP status codes. Use async/await with try-catch for cleaner code." },
    { question: "What is the purpose of streams in Node.js?", intention: "Assess knowledge of Node.js data handling.", answer: "Streams handle data piece by piece without loading everything into memory. Types: Readable, Writable, Duplex, Transform. Used for file operations, HTTP responses, and data processing pipelines. Provide backpressure handling and memory efficiency." }
  ],
  sql: [
    { question: "Explain the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN.", intention: "Assess SQL join knowledge.", answer: "INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from left table and matched rows from right (NULL for unmatched). RIGHT JOIN is opposite of LEFT JOIN. FULL OUTER JOIN returns all rows from both tables." },
    { question: "What is normalization? Explain the first three normal forms.", intention: "Evaluate database design principles.", answer: "Normalization reduces data redundancy. 1NF: atomic values, no repeating groups. 2NF: no partial dependencies (all non-key attributes depend on entire primary key). 3NF: no transitive dependencies (non-key attributes depend only on primary key)." },
    { question: "How do you optimize a slow SQL query?", intention: "Test performance tuning skills.", answer: "Use EXPLAIN to analyze query plan. Add appropriate indexes, avoid SELECT *, use proper JOIN types, limit result sets, avoid functions on indexed columns in WHERE, consider query restructuring, and use covering indexes." },
    { question: "What are database indexes and when should you use them?", intention: "Assess understanding of database optimization.", answer: "Indexes are data structures that speed up data retrieval. Use them on frequently queried columns, foreign keys, and columns in WHERE/ORDER BY. Avoid over-indexing as it slows writes. Consider composite indexes for multi-column queries." }
  ],
  "api": [
    { question: "Explain the difference between REST and GraphQL APIs.", intention: "Assess API design knowledge.", answer: "REST uses multiple endpoints with fixed data structures, HTTP methods, and is cacheable. GraphQL uses a single endpoint, client specifies exactly what data it needs, supports real-time with subscriptions. REST is simpler, GraphQL is more flexible." },
    { question: "What is API versioning and what strategies exist?", intention: "Evaluate API design best practices.", answer: "API versioning manages breaking changes. Strategies: URL versioning (/v1/, /v2/), header versioning (Accept: application/vnd.api.v1+json), query parameter versioning (?v=1). URL versioning is most common and explicit." },
    { question: "How do you secure a REST API?", intention: "Test security best practices knowledge.", answer: "Use HTTPS, authentication (JWT/OAuth), authorization (role-based), input validation, rate limiting, CORS configuration, parameterized queries (prevent SQL injection), sanitize outputs, implement proper error handling without leaking info." },
    { question: "Explain pagination strategies for APIs.", intention: "Assess API design for large datasets.", answer: "Offset-based (LIMIT/OFFSET), cursor-based (using last item ID), keyset pagination. Cursor-based is more efficient for large datasets as it avoids scanning skipped rows. Offset is simpler but degrades with large offsets." }
  ],
  typescript: [
    { question: "What are TypeScript generics and why are they useful?", intention: "Assess advanced TypeScript knowledge.", answer: "Generics allow creating reusable components that work with multiple types while maintaining type safety. They use type parameters (T) that are specified when the component is used. Useful for collections, APIs, and utility functions." },
    { question: "Explain the difference between interface and type in TypeScript.", intention: "Evaluate TypeScript type system understanding.", answer: "Interfaces are extendable, support declaration merging, and are better for object shapes. Types are more flexible (unions, intersections, primitives, tuples) but cannot be merged. Use interfaces for public APIs, types for complex type manipulations." },
    { question: "What are utility types in TypeScript? Name a few.", intention: "Test TypeScript practical knowledge.", answer: "Utility types transform existing types: Partial<T> makes all properties optional, Required<T> makes all required, Pick<T,K> selects specific properties, Omit<T,K> excludes properties, Record<K,V> creates object type from keys and values." }
  ],
  docker: [
    { question: "What is Docker and how does it differ from virtual machines?", intention: "Assess containerization knowledge.", answer: "Docker packages applications with dependencies into lightweight containers sharing the host OS kernel. VMs include full OS, making them heavier. Containers start faster, use fewer resources, but share the host kernel (less isolation than VMs)." },
    { question: "Explain Docker Compose and its use cases.", intention: "Evaluate multi-container orchestration knowledge.", answer: "Docker Compose defines and runs multi-container applications using YAML. Specifies services, networks, volumes. Used for development environments, microservices, and testing. Single command to start entire application stack." },
    { question: "How do you optimize Docker images for production?", intention: "Test Docker best practices.", answer: "Use multi-stage builds, minimal base images (alpine, distroless), combine RUN commands to reduce layers, use .dockerignore, pin versions, remove unnecessary files, and leverage build cache effectively." }
  ],
  aws: [
    { question: "Explain the difference between EC2, Lambda, and ECS.", intention: "Assess AWS compute service knowledge.", answer: "EC2 provides virtual servers (full control, manage OS). Lambda is serverless functions (event-driven, no server management, pay per execution). ECS is container orchestration (run Docker containers at scale). Choose based on control vs management tradeoff." },
    { question: "What is S3 and what are its common use cases?", intention: "Evaluate AWS storage service knowledge.", answer: "S3 is object storage service. Use cases: static website hosting, data lakes, backup/archival, media storage, application assets. Features: versioning, lifecycle policies, encryption, cross-region replication, event notifications." },
    { question: "How do you secure AWS resources?", intention: "Test AWS security best practices.", answer: "Use IAM roles/policies (least privilege), security groups, NACLs, KMS encryption, CloudTrail for auditing, VPC for network isolation, enable MFA, use Secrets Manager for credentials, and implement proper access logging." }
  ],
  git: [
    { question: "Explain the difference between git merge and git rebase.", intention: "Assess Git workflow knowledge.", answer: "Merge creates a new commit combining branches, preserving history. Rebase rewrites history by applying commits on top of target branch, creating linear history. Use merge for shared branches, rebase for local cleanup before merging." },
    { question: "How do you resolve a merge conflict in Git?", intention: "Evaluate practical Git skills.", answer: "Git marks conflicting sections in files. Manually edit to resolve, remove conflict markers, then git add and git commit. Use merge tools, communicate with team, and test after resolution. git merge --abort to cancel." },
    { question: "What is git stash and when would you use it?", intention: "Test Git workflow knowledge.", answer: "git stash temporarily saves uncommitted changes and reverts working directory to last commit. Use when switching branches without committing, pulling changes with uncommitted work. git stash pop to restore, git stash list to view." }
  ],
  mongodb: [
    { question: "Compare MongoDB with relational databases. When to use each?", intention: "Assess database selection knowledge.", answer: "MongoDB is document-based, schema-flexible, scales horizontally. Good for unstructured data, rapid iteration, content management. RDBMS is table-based, ACID-compliant, strong consistency. Better for complex transactions, structured data, financial systems." },
    { question: "How do you design a MongoDB schema for a blog application?", intention: "Evaluate NoSQL schema design skills.", answer: "Embed comments in posts if few, reference if many. Use embedded arrays for tags/categories. Consider query patterns: embed data read together, reference data shared across documents. Use indexes on frequently queried fields." },
    { question: "Explain MongoDB indexing and aggregation pipeline.", intention: "Test MongoDB performance and querying knowledge.", answer: "Indexes speed up queries (single, compound, text, geospatial). Aggregation pipeline processes documents through stages: $match, $group, $sort, $project, $lookup (joins). Each stage transforms documents passed to next stage." }
  ],
  testing: [
    { question: "What is the testing pyramid? Explain each level.", intention: "Assess testing strategy knowledge.", answer: "Testing pyramid: Unit tests (base, many, fast, test individual functions), Integration tests (middle, test component interaction), E2E tests (top, few, slow, test full user flows). More unit tests, fewer E2E tests for optimal coverage and speed." },
    { question: "How do you write effective unit tests?", intention: "Evaluate testing best practices.", answer: "Follow AAA pattern (Arrange, Act, Assert). Test one thing per test. Use descriptive names. Mock external dependencies. Test edge cases and error paths. Keep tests independent and deterministic. Aim for high coverage of critical paths." },
    { question: "What is TDD and what are its benefits?", intention: "Test understanding of test-driven development.", answer: "TDD: Write failing test first, write minimal code to pass, refactor. Benefits: better design, comprehensive test coverage, documentation through tests, confidence in refactoring, fewer bugs. Red-Green-Refactor cycle." }
  ]
};

const BEHAVIORAL_QUESTIONS = [
  { question: "Tell me about a challenging technical problem you solved recently.", intention: "Assess problem-solving approach and technical depth.", answer: "Describe the problem context, your approach (breaking it down, researching, experimenting), the solution implemented, and the measurable impact. Use STAR format (Situation, Task, Action, Result)." },
  { question: "Describe a time you had to learn a new technology quickly.", intention: "Evaluate adaptability and learning ability.", answer: "Explain the situation requiring quick learning, your learning strategy (documentation, tutorials, building small projects), how you applied it, and the outcome. Show systematic learning approach." },
  { question: "How do you handle disagreements with team members on technical decisions?", intention: "Test collaboration and communication skills.", answer: "Listen to their perspective, present data-driven arguments, suggest proof-of-concepts if needed, be willing to compromise, and focus on what's best for the project. Escalate only when necessary." },
  { question: "Tell me about a time you made a mistake in production.", intention: "Assess accountability and incident response.", answer: "Acknowledge the mistake, explain how you identified it, the immediate fix, the root cause analysis, and the preventive measures implemented. Focus on learning and process improvement." },
  { question: "Describe your experience working in an Agile/Scrum environment.", intention: "Evaluate team process familiarity.", answer: "Discuss daily standups, sprint planning, retrospectives, and your role. Mention how you estimate tasks, handle blockers, and collaborate with team members and stakeholders." },
  { question: "How do you prioritize tasks when you have multiple deadlines?", intention: "Test time management and prioritization.", answer: "Assess urgency and impact, communicate with stakeholders, break tasks into smaller chunks, focus on high-impact items first, and proactively communicate if timelines need adjustment." },
  { question: "Tell me about a project you're particularly proud of.", intention: "Gauge passion and technical ownership.", answer: "Describe the project's purpose, your specific contributions, technical challenges overcome, and the impact/outcome. Show enthusiasm and explain why it matters to you." },
  { question: "How do you stay updated with the latest technology trends?", intention: "Assess continuous learning mindset.", answer: "Follow tech blogs, read documentation, attend meetups/conferences, contribute to open source, build side projects, participate in developer communities, and take online courses." },
  { question: "Describe a time you improved a process or system at work.", intention: "Evaluate initiative and optimization mindset.", answer: "Identify the inefficiency, propose a solution, implement it with team buy-in, measure the improvement (time saved, errors reduced), and document the change for future reference." },
  { question: "How do you approach code reviews?", intention: "Test collaboration and code quality mindset.", answer: "Review for correctness first, then readability, performance, and security. Provide constructive feedback with suggestions. Appreciate good patterns. Keep reviews focused and respectful." }
];

const SKILL_GAPS = [
  { skill: "System Design", severity: "Medium" },
  { skill: "Cloud Architecture", severity: "Medium" },
  { skill: "Performance Optimization", severity: "Low" },
  { skill: "Security Best Practices", severity: "Medium" },
  { skill: "Testing & QA", severity: "Low" },
  { skill: "CI/CD Pipelines", severity: "Medium" },
  { skill: "Microservices Architecture", severity: "High" },
  { skill: "Database Optimization", severity: "Low" },
  { skill: "DevOps Practices", severity: "Medium" },
  { skill: "API Design Patterns", severity: "Low" },
  { skill: "Data Structures & Algorithms", severity: "Medium" },
  { skill: "Design Patterns", severity: "Medium" },
  { skill: "Containerization", severity: "Low" },
  { skill: "Monitoring & Observability", severity: "Medium" },
  { skill: "Agile Methodology", severity: "Low" }
];

function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s+#.]/g, ' ').split(/\s+/);
  return [...new Set(words.filter(w => w.length > 2))];
}

function detectTechnologies(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const techMap = {
    javascript: /\b(javascript|js|es6|ecmascript)\b/,
    python: /\b(python|django|flask|fastapi|pip)\b/,
    react: /\b(react|reactjs|react\.js|jsx|next\.?js)\b/,
    node: /\b(node|node\.?js|express|nestjs|koa)\b/,
    sql: /\b(sql|mysql|postgresql|postgres|sqlite|oracle|mssql)\b/,
    api: /\b(api|rest|graphql|soap|webhook|microservice)\b/,
    typescript: /\b(typescript|ts|tsx)\b/,
    docker: /\b(docker|container|dockerfile|compose)\b/,
    aws: /\b(aws|amazon\s*web\s*service|ec2|lambda|s3|cloudfront|rds|dynamodb)\b/,
    git: /\b(git|github|gitlab|bitbucket)\b/,
    mongodb: /\b(mongo|mongodb|nosql|mongoose)\b/,
    testing: /\b(test|jest|mocha|cypress|selenium|unit\s*test|e2e|integration\s*test)\b/
  };

  const detected = [];
  for (const [tech, regex] of Object.entries(techMap)) {
    if (regex.test(lower)) detected.push(tech);
  }
  return detected;
}

function generateFallbackTechnicalQuestions(technologies, keywords) {
  const questions = [];
  const usedIndices = new Set();

  for (const tech of technologies) {
    const pool = TECH_QUESTIONS[tech];
    if (!pool) continue;

    const count = Math.min(2, pool.length);
    let added = 0;

    for (let i = 0; i < pool.length && added < count; i++) {
      if (!usedIndices.has(`${tech}-${i}`)) {
        questions.push({...pool[i]});
        usedIndices.add(`${tech}-${i}`);
        added++;
      }
    }
  }

  if (questions.length < 4) {
    const generalQuestions = [
      { question: "Explain the software development lifecycle (SDLC) and your role in it.", intention: "Assess understanding of development processes.", answer: "SDLC includes planning, analysis, design, implementation, testing, deployment, and maintenance. Describe your involvement in each phase and how you collaborate with team members." },
      { question: "How do you approach debugging a complex issue?", intention: "Evaluate systematic problem-solving skills.", answer: "Reproduce the issue, isolate the problem area, check logs, use debugging tools, form hypotheses, test them, fix the root cause (not symptoms), write tests to prevent regression." },
      { question: "What design patterns have you used and when?", intention: "Test architectural knowledge.", answer: "Common patterns: Singleton (single instance), Factory (object creation), Observer (event handling), Strategy (interchangeable algorithms), Decorator (adding behavior). Explain context and benefits." },
      { question: "How do you ensure code quality in your projects?", intention: "Assess quality mindset and practices.", answer: "Code reviews, automated testing, linting/formatting, CI/CD pipelines, documentation, following SOLID principles, keeping functions small and focused, and continuous refactoring." },
      { question: "Explain the difference between synchronous and asynchronous programming.", intention: "Test concurrency knowledge.", answer: "Synchronous: blocking, sequential execution. Asynchronous: non-blocking, allows other operations while waiting. Async improves responsiveness and resource utilization. Implemented via callbacks, promises, async/await." },
      { question: "What is CI/CD and why is it important?", intention: "Evaluate DevOps knowledge.", answer: "CI (Continuous Integration): automatically build and test code on each commit. CD (Continuous Delivery/Deployment): automatically release to staging/production. Benefits: faster releases, fewer bugs, consistent deployment process." },
      { question: "How do you handle authentication and authorization in web applications?", intention: "Test security implementation knowledge.", answer: "Authentication: verifying identity (JWT, OAuth, sessions). Authorization: verifying permissions (RBAC, ABAC). Best practices: hash passwords (bcrypt), use HTTPS, implement token expiration, validate on server-side." }
    ];

    for (const q of generalQuestions) {
      if (questions.length >= 6) break;
      if (!questions.find(existing => existing.question === q.question)) {
        questions.push({...q});
      }
    }
  }

  return questions.slice(0, 8);
}

function calculateMatchScore(resume, jobDescription) {
  if (!resume || !jobDescription) return 45;

  const resumeKeywords = extractKeywords(resume);
  const jobKeywords = extractKeywords(jobDescription);

  const jobImportant = jobKeywords.filter(k =>
    k.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'been', 'will', 'your', 'work', 'team', 'role', 'experience', 'skills', 'must', 'should', 'would', 'candidate', 'position', 'company', 'required', 'requirement', 'responsibility'].includes(k)
  );

  if (jobImportant.length === 0) return 50;

  let matches = 0;
  for (const keyword of jobImportant) {
    if (resumeKeywords.some(rk => rk.includes(keyword) || keyword.includes(rk))) {
      matches++;
    }
  }

  const rawScore = Math.round((matches / jobImportant.length) * 100);
  return Math.min(95, Math.max(25, rawScore));
}

function generateFallbackSkillGaps(technologies, resume) {
  const gaps = [];
  const usedSkills = new Set();

  const resumeLower = (resume || '').toLowerCase();

  for (const gap of SKILL_GAPS) {
    if (gaps.length >= 5) break;
    if (usedSkills.has(gap.skill)) continue;

    const skillLower = gap.skill.toLowerCase();
    if (!resumeLower.includes(skillLower) && !resumeLower.includes(skillLower.split(' ')[0])) {
      gaps.push({...gap});
      usedSkills.add(gap.skill);
    }
  }

  const techGapMap = {
    javascript: { skill: "Advanced JavaScript Patterns", severity: "Low" },
    python: { skill: "Python Performance Tuning", severity: "Low" },
    react: { skill: "React Performance Optimization", severity: "Low" },
    node: { skill: "Node.js Scalability", severity: "Medium" },
    sql: { skill: "Advanced SQL Queries", severity: "Low" },
    typescript: { skill: "TypeScript Advanced Types", severity: "Low" },
    docker: { skill: "Docker Production Deployment", severity: "Medium" },
    aws: { skill: "AWS Architecture", severity: "High" },
    mongodb: { skill: "MongoDB Aggregation", severity: "Low" }
  };

  for (const tech of technologies) {
    if (gaps.length >= 5) break;
    const techGap = techGapMap[tech];
    if (techGap && !usedSkills.has(techGap.skill)) {
      gaps.push({...techGap});
      usedSkills.add(techGap.skill);
    }
  }

  if (gaps.length === 0) {
    gaps.push(SKILL_GAPS[0], SKILL_GAPS[3], SKILL_GAPS[6]);
  }

  return gaps.slice(0, 5);
}

function generateFallbackPreparationPlan(technologies, skillGaps) {
  const plan = [];
  const allTopics = [...technologies];

  for (const gap of skillGaps) {
    if (!allTopics.includes(gap.skill.toLowerCase().split(' ')[0])) {
      allTopics.push(gap.skill.toLowerCase().split(' ')[0]);
    }
  }

  const taskTemplates = {
    javascript: ["Complete JavaScript fundamentals course", "Build 2-3 small projects using ES6+ features", "Practice coding challenges on LeetCode/HackerRank", "Study closures, promises, and async/await patterns"],
    python: ["Complete Python advanced concepts tutorial", "Build a REST API using Flask/FastAPI", "Study decorators, generators, and context managers", "Practice data structures and algorithms in Python"],
    react: ["Build a complete React application with hooks", "Study React performance optimization techniques", "Learn state management (Context API or Redux)", "Practice component patterns and custom hooks"],
    node: ["Build a RESTful API with Express.js", "Study middleware and error handling patterns", "Learn database integration (MongoDB/PostgreSQL)", "Implement authentication with JWT"],
    sql: ["Practice complex JOIN queries", "Learn query optimization and indexing", "Study database normalization", "Build a project with database design"],
    api: ["Design and document a REST API", "Implement API versioning strategies", "Learn GraphQL basics and compare with REST", "Implement rate limiting and security measures"],
    typescript: ["Convert a JavaScript project to TypeScript", "Study generics and utility types", "Learn type narrowing and type guards", "Practice advanced type patterns"],
    docker: ["Containerize a simple application", "Learn Docker Compose for multi-container apps", "Study multi-stage builds for optimization", "Deploy containers to a cloud platform"],
    aws: ["Complete AWS Cloud Practitioner basics", "Deploy an application to EC2 or Lambda", "Learn S3, RDS, and other core services", "Study IAM and security best practices"],
    git: ["Practice branching strategies (GitFlow)", "Learn rebasing and conflict resolution", "Study Git hooks and automation", "Contribute to an open-source project"],
    mongodb: ["Design a MongoDB schema for a project", "Practice aggregation pipeline queries", "Learn indexing strategies", "Compare with relational databases"],
    testing: ["Write unit tests for an existing project", "Learn integration testing patterns", "Study mocking and test doubles", "Set up CI/CD with automated tests"]
  };

  const techFocusMap = {
    javascript: "JavaScript Fundamentals & Advanced Concepts",
    python: "Python Programming & Best Practices",
    react: "React Development & Component Architecture",
    node: "Node.js Backend Development",
    sql: "Database Design & SQL Optimization",
    api: "API Design & Development",
    typescript: "TypeScript & Type Safety",
    docker: "Docker & Containerization",
    aws: "Cloud Computing & AWS Services",
    git: "Version Control & Git Workflows",
    mongodb: "NoSQL & MongoDB",
    testing: "Testing Strategies & Implementation"
  };

  let dayCounter = 1;
  const days = Math.min(14, Math.max(7, allTopics.length * 2));

  for (let i = 0; i < days && dayCounter <= 14; i++) {
    const topicIndex = i % allTopics.length;
    const topic = allTopics[topicIndex];
    const tasks = taskTemplates[topic] || [
      `Study ${topic} fundamentals and best practices`,
      `Build a small project using ${topic}`,
      `Practice ${topic} coding exercises`,
      `Review common ${topic} interview questions`
    ];

    const focus = techFocusMap[topic] || `${topic.charAt(0).toUpperCase() + topic.slice(1)} Mastery`;

    plan.push({
      day: dayCounter,
      focus,
      tasks: tasks.slice(0, 3)
    });

    dayCounter++;
  }

  if (plan.length < 5) {
    plan.push(
      { day: dayCounter++, focus: "Mock Interviews & Practice", tasks: ["Complete 2-3 mock interviews", "Review common interview questions", "Practice whiteboard coding"] },
      { day: dayCounter++, focus: "Project Portfolio Review", tasks: ["Update GitHub profile", "Document key projects", "Prepare project explanations"] },
      { day: dayCounter++, focus: "Final Preparation", tasks: ["Review weak areas", "Practice behavioral questions", "Prepare questions for interviewer"] }
    );
  }

  return plan.slice(0, 10);
}

function generateFallbackReport(resume, selfDescription, jobDescription) {
  const candidateInfo = resume || selfDescription || '';
  const combinedText = `${candidateInfo}\n${jobDescription}`;

  const technologies = detectTechnologies(combinedText);
  const keywords = extractKeywords(combinedText);

  return {
    matchScore: calculateMatchScore(candidateInfo, jobDescription),
    technicalQuestions: generateFallbackTechnicalQuestions(technologies, keywords),
    behavioralQuestions: BEHAVIORAL_QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 5).map(q => ({...q})),
    skillGaps: generateFallbackSkillGaps(technologies, candidateInfo),
    preparationPlan: generateFallbackPreparationPlan(technologies, generateFallbackSkillGaps(technologies, candidateInfo))
  };
}

// ─── Ollama AI engine ──────────────────────────────────────────────────────

async function checkOllamaAvailable() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const models = res.data.models || [];
    const modelExists = models.some(m => m.name.startsWith(OLLAMA_MODEL));
    return { available: true, hasModel: modelExists, models: models.map(m => m.name) };
  } catch {
    return { available: false, hasModel: false, models: [] };
  }
}

async function pullOllamaModel() {
  console.log(`[Ollama] Pulling model "${OLLAMA_MODEL}" (this may take a few minutes on first run)...`);
  try {
    await axios.post(`${OLLAMA_URL}/api/pull`, { name: OLLAMA_MODEL }, { timeout: 600000 });
    console.log(`[Ollama] Model "${OLLAMA_MODEL}" pulled successfully.`);
    return true;
  } catch (err) {
    console.error(`[Ollama] Failed to pull model: ${err.message}`);
    return false;
  }
}

async function queryOllama(prompt) {
  const res = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 4096
    }
  }, { timeout: 120000 });

  return res.data.response;
}

function parseOllamaResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const cleaned = jsonMatch[0]
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    return JSON.parse(cleaned);
  } catch {
    console.error("[Ollama] Failed to parse AI response, falling back to keyword engine");
    return null;
  }
}

async function generateOllamaReport(resume, selfDescription, jobDescription) {
  const candidateInfo = resume || selfDescription || '';

  const prompt = `You are an expert technical interviewer and career coach. Analyze the following candidate information and job description to create a comprehensive interview preparation report.

CANDIDATE INFO:
${candidateInfo}

JOB DESCRIPTION:
${jobDescription}

Respond with ONLY valid JSON (no markdown, no explanations) in this exact format:
{
  "matchScore": <number 0-100>,
  "technicalQuestions": [
    {"question": "<string>", "intention": "<string>", "answer": "<string>"}
  ],
  "behavioralQuestions": [
    {"question": "<string>", "intention": "<string>", "answer": "<string>"}
  ],
  "skillGaps": [
    {"skill": "<string>", "severity": "<Low|Medium|High>"}
  ],
  "preparationPlan": [
    {"day": <number>, "focus": "<string>", "tasks": ["<string>"]}
  ]
}

Requirements:
- matchScore: Calculate how well the candidate matches the job (0-100)
- technicalQuestions: Exactly 8 questions specific to technologies mentioned in the job description and candidate's experience
- behavioralQuestions: Exactly 5 questions about teamwork, leadership, problem-solving, and cultural fit
- skillGaps: Exactly 5 skills the candidate should improve, with severity
- preparationPlan: Exactly 10 days of focused preparation, with 2-3 tasks per day
- All answers should be detailed and educational
- Questions should be realistic and commonly asked in actual interviews`;

  console.log("[Ollama] Querying AI model for interview report generation...");
  const response = await queryOllama(prompt);
  const parsed = parseOllamaResponse(response);

  if (!parsed) return null;

  // Validate and normalize the response
  const normalized = {
    matchScore: typeof parsed.matchScore === 'number' ? Math.min(100, Math.max(0, parsed.matchScore)) : 50,
    technicalQuestions: Array.isArray(parsed.technicalQuestions) ? parsed.technicalQuestions.slice(0, 8).map(q => ({
      question: q.question || "N/A",
      intention: q.intention || "Assess technical knowledge",
      answer: q.answer || "See documentation for details."
    })) : [],
    behavioralQuestions: Array.isArray(parsed.behavioralQuestions) ? parsed.behavioralQuestions.slice(0, 5).map(q => ({
      question: q.question || "N/A",
      intention: q.intention || "Assess behavioral competencies",
      answer: q.answer || "Use STAR method to structure your response."
    })) : [],
    skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps.slice(0, 5).map(g => ({
      skill: g.skill || "General skill improvement",
      severity: ["Low", "Medium", "High"].includes(g.severity) ? g.severity : "Medium"
    })) : [],
    preparationPlan: Array.isArray(parsed.preparationPlan) ? parsed.preparationPlan.slice(0, 10).map(p => ({
      day: typeof p.day === 'number' ? p.day : 1,
      focus: p.focus || "Study and practice",
      tasks: Array.isArray(p.tasks) ? p.tasks.slice(0, 3) : ["Review study materials"]
    })) : []
  };

  // Ensure minimum content
  if (normalized.technicalQuestions.length < 4 || normalized.behavioralQuestions.length < 3) {
    console.log("[Ollama] AI response incomplete, falling back to keyword engine");
    return null;
  }

  return normalized;
}

// ─── Main entry point ──────────────────────────────────────────────────────

async function generateInterviewReport({resume, selfDescription, jobDescription}) {
  try {
    const ollamaStatus = await checkOllamaAvailable();

    if (ollamaStatus.available && ollamaStatus.hasModel) {
      try {
        const report = await generateOllamaReport(resume, selfDescription, jobDescription);
        if (report) {
          console.log("[AI] Report generated using Ollama");
          return report;
        }
      } catch (err) {
        console.error(`[Ollama] Generation failed: ${err.message}. Using fallback engine.`);
      }
    } else if (ollamaStatus.available && !ollamaStatus.hasModel) {
      console.log(`[Ollama] Running but model "${OLLAMA_MODEL}" not found. Auto-pulling...`);
      const pulled = await pullOllamaModel();
      if (pulled) {
        try {
          const report = await generateOllamaReport(resume, selfDescription, jobDescription);
          if (report) {
            console.log("[AI] Report generated using Ollama (auto-pulled model)");
            return report;
          }
        } catch (err) {
          console.error(`[Ollama] Generation failed after pull: ${err.message}. Using fallback engine.`);
        }
      } else {
        console.log("[Ollama] Auto-pull failed. Using fallback engine.");
      }
    } else {
      console.log("[Ollama] Not available. Using fallback keyword-based AI engine.");
    }

    // Fallback to keyword-based engine
    const fallbackReport = generateFallbackReport(resume, selfDescription, jobDescription);
    console.log("[AI] Report generated using fallback keyword engine");
    return fallbackReport;
  } catch (error) {
    console.error("[AI] Critical error, using fallback:", error.message);
    return generateFallbackReport(resume, selfDescription, jobDescription);
  }
}

module.exports = generateInterviewReport;
