const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// ─── Dynamic Fallback AI Engine (content-aware) ─────────────────────────────

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","shall","can",
  "this","that","these","those","it","its","they","them","their","we","our",
  "you","your","he","him","his","she","her","i","me","my","not","no","so",
  "if","as","than","then","about","into","over","after","before","between",
  "under","again","there","here","when","where","why","how","all","each",
  "every","both","few","more","most","other","some","such","only","own",
  "same","also","very","just","because","while","what","which","who","whom",
  "must","need","able","role","team","work","job","position","company",
  "candidate","required","requirements","responsibilities","skills",
  "experience","strong","looking","ideal","preferred","including","will",
  "ensure","maintain","develop","design","implement","create","provide",
  "support","collaborate","participate","contribute","demonstrate","apply"
]);

const TECH_ALIASES = {
  "javascript": ["javascript","js","es6","ecmascript","es2015","es2020"],
  "typescript": ["typescript","ts","tsx"],
  "react": ["react","reactjs","react.js","jsx","next.js","nextjs","gatsby"],
  "angular": ["angular","angularjs","angular.js"],
  "vue": ["vue","vuejs","vue.js","nuxt","vuex"],
  "node": ["node","node.js","nodejs","express.js","expressjs","nestjs","koa","fastify"],
  "python": ["python","django","flask","fastapi","pyramid","tornado"],
  "java": ["java","spring","spring boot","springboot","hibernate","maven","gradle","jvm"],
  "csharp": ["c#","c sharp","dotnet",".net","asp.net","aspnet","blazor","xamarin"],
  "go": ["go","golang"],
  "rust": ["rust","rustlang"],
  "ruby": ["ruby","rails","ruby on rails","sinatra"],
  "php": ["php","laravel","symfony","wordpress","drupal"],
  "sql": ["sql","mysql","postgresql","postgres","sqlite","oracle","mssql","sql server","mariadb","relational database"],
  "mongodb": ["mongodb","mongo","mongoose","nosql","document database"],
  "redis": ["redis","memcached","cache"],
  "elasticsearch": ["elasticsearch","elastic","lucene"],
  "graphql": ["graphql","apollo","relay","prisma"],
  "rest": ["rest","restful","rest api"],
  "docker": ["docker","container","containerization","dockerfile","docker compose","docker-compose"],
  "kubernetes": ["kubernetes","k8s","helm","istio","openshift"],
  "aws": ["aws","amazon web services","ec2","lambda","s3","cloudfront","rds","dynamodb","cloudformation","sns","sqs","ecs","eks","iam","cloudwatch"],
  "azure": ["azure","microsoft azure","azure functions","azure devops","azure sql"],
  "gcp": ["gcp","google cloud","gce","gke","bigquery","cloud functions","firebase"],
  "ci_cd": ["ci/cd","ci cd","cicd","jenkins","github actions","gitlab ci","circleci","travis","continuous integration","continuous deployment","continuous delivery","pipeline"],
  "testing": ["testing","jest","mocha","chai","cypress","selenium","playwright","vitest","unit test","integration test","e2e","end to end test","tdd"],
  "git": ["git","github","gitlab","bitbucket","version control"],
  "agile": ["agile","scrum","kanban","sprint","jira","confluence"],
  "linux": ["linux","unix","bash","shell","command line","terminal"],
  "nginx": ["nginx","apache","web server","reverse proxy"],
  "terraform": ["terraform","iac","infrastructure as code","pulumi","cloudformation"],
  "microservices": ["microservices","micro service","service oriented","soa","event driven"],
  "websocket": ["websocket","socket.io","real-time","real time","websockets"],
  "sass": ["sass","scss","css","less","styled components","tailwind","bootstrap","material ui","mui"],
  "webpack": ["webpack","vite","rollup","parcel","bundler","esbuild"],
  "machine_learning": ["machine learning","ml","deep learning","tensorflow","pytorch","scikit","ai","artificial intelligence","nlp","computer vision"],
  "data_structures": ["data structures","algorithms","dsa","big o","complexity","sorting","graph","tree","dynamic programming"],
  "security": ["security","oauth","jwt","authentication","authorization","encryption","cors","csrf","xss","sql injection","penetration testing"],
  "performance": ["performance","optimization","caching","cdn","lazy loading","code splitting","bundle size","load time","rendering"],
  "serverless": ["serverless","lambda","cloud functions","azure functions","faas"],
  "blockchain": ["blockchain","solidity","ethereum","web3","smart contract","defi"],
  "mobile": ["react native","flutter","swift","kotlin","android","ios","mobile app","xamarin","ionic"],
  "devops": ["devops","monitoring","observability","datadog","new relic","prometheus","grafana","logging","elk","splunk"],
  "system_design": ["system design","scalability","load balancing","distributed systems","cap theorem","sharding","replication","caching strategy"]
};

const TECH_CANONICAL = {};
for (const [canonical, aliases] of Object.entries(TECH_ALIASES)) {
  for (const alias of aliases) {
    TECH_CANONICAL[alias] = canonical;
  }
}

const TECH_DISPLAY = {
  javascript: "JavaScript", typescript: "TypeScript", react: "React", angular: "Angular",
  vue: "Vue.js", node: "Node.js", python: "Python", java: "Java", csharp: "C#",
  go: "Go", rust: "Rust", ruby: "Ruby", php: "PHP", sql: "SQL", mongodb: "MongoDB",
  redis: "Redis", elasticsearch: "Elasticsearch", graphql: "GraphQL", rest: "REST API",
  docker: "Docker", kubernetes: "Kubernetes", aws: "AWS", azure: "Azure", gcp: "Google Cloud",
  ci_cd: "CI/CD", testing: "Testing", git: "Git", agile: "Agile/Scrum", linux: "Linux",
  nginx: "Nginx", terraform: "Terraform", microservices: "Microservices", websocket: "WebSockets",
  sass: "CSS/Styling", webpack: "Build Tools", machine_learning: "Machine Learning",
  data_structures: "Data Structures & Algorithms", security: "Security",
  performance: "Performance Optimization", serverless: "Serverless", blockchain: "Blockchain",
  mobile: "Mobile Development", devops: "DevOps & Monitoring", system_design: "System Design"
};

const ROLE_PATTERNS = [
  { regex: /\b(senior|sr\.?|lead|staff|principal|architect|manager|head of|director|sde\s*iii|sde3|level\s*3)\b/i, level: "senior" },
  { regex: /\b(mid.level|mid\s*level|intermediate|sde\s*ii|sde2|level\s*2)\b/i, level: "mid" },
  { regex: /\b(junior|entry.level|intern|associate|trainee|fresher)\b/i, level: "junior" }
];

const DOMAIN_PATTERNS = [
  { regex: /\b(front\s*end|frontend|front.end|ui\s*engineer|ui\s*developer|client.side)\b/i, domain: "Frontend" },
  { regex: /\b(back\s*end|backend|back.end|server.side|api\s*developer|service\s*developer)\b/i, domain: "Backend" },
  { regex: /\b(full\s*stack|fullstack|full.stack)\b/i, domain: "Full Stack" },
  { regex: /\b(devops|sre|site\s*reliability|platform\s*engineer|infrastructure)\b/i, domain: "DevOps" },
  { regex: /\b(data\s*scientist|ml\s*engineer|machine\s*learning|ai\s*engineer)\b/i, domain: "Data/ML" },
  { regex: /\b(mobile|android|ios|react\s*native|flutter)\b/i, domain: "Mobile" },
  { regex: /\b(cloud|cloud\s*engineer|cloud\s*architect)\b/i, domain: "Cloud" },
  { regex: /\b(security|cyber\s*security|infosec|penetration)\b/i, domain: "Security" },
  { regex: /\b(qa|quality\s*assurance|test\s*engineer|sdet|test\s*automation)\b/i, domain: "QA/Testing" },
  { regex: /\b(devrel|developer\s*advocate|technical\s*writer)\b/i, domain: "Developer Relations" }
];

function extractWords(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s+#./-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function detectTechnologies(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set();

  for (const [canonical, aliases] of Object.entries(TECH_ALIASES)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        found.add(canonical);
        break;
      }
    }
  }
  return [...found];
}

function detectRoleLevel(text) {
  if (!text) return "mid";
  for (const pattern of ROLE_PATTERNS) {
    if (pattern.regex.test(text)) return pattern.level;
  }
  return "mid";
}

function detectDomain(text) {
  if (!text) return ["General"];
  const domains = [];
  for (const pattern of DOMAIN_PATTERNS) {
    if (pattern.regex.test(text)) domains.push(pattern.domain);
  }
  return domains.length > 0 ? domains : ["General"];
}

function extractKeyPhrases(text, maxPhrases = 30) {
  if (!text) return [];
  const words = extractWords(text);
  const phrases = [];
  const bigrams = [];

  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words[i] + ' ' + words[i + 1];
    if (!STOP_WORDS.has(words[i]) || !STOP_WORDS.has(words[i + 1])) {
      bigrams.push(phrase);
    }
  }

  const wordFreq = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
  }

  const sorted = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(e => e[0]);

  const bigramFreq = {};
  for (const bg of bigrams) {
    const parts = bg.split(' ');
    if (!STOP_WORDS.has(parts[0]) || !STOP_WORDS.has(parts[1])) {
      bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
    }
  }

  const sortedBigrams = Object.entries(bigramFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.floor(maxPhrases / 2))
    .map(e => e[0]);

  return [...new Set([...sortedBigrams, ...sorted])];
}

function calculateMatchScore(candidateInfo, jobDescription) {
  if (!candidateInfo || !jobDescription) return 45;

  const candidateTechs = detectTechnologies(candidateInfo);
  const jobTechs = detectTechnologies(jobDescription);

  const jobWords = extractWords(jobDescription).filter(w => !STOP_WORDS.has(w) && w.length > 3);
  const candidateWords = new Set(extractWords(candidateInfo));

  if (jobTechs.length === 0 && jobWords.length === 0) return 50;

  let techMatch = 0;
  if (jobTechs.length > 0) {
    for (const t of jobTechs) {
      if (candidateTechs.includes(t)) techMatch++;
    }
    techMatch /= jobTechs.length;
  }

  let wordMatch = 0;
  if (jobWords.length > 0) {
    let matched = 0;
    for (const w of jobWords) {
      if (candidateWords.has(w)) matched++;
    }
    wordMatch = matched / jobWords.length;
  }

  const rawScore = Math.round((techMatch * 0.6 + wordMatch * 0.4) * 100);
  return Math.min(95, Math.max(15, rawScore));
}

// ─── Dynamic Question Generation ────────────────────────────────────────────

const TECH_QUESTION_TEMPLATES = {
  javascript: [
    { q: "How do you manage state and data flow in a {tech1} application when building {domain} features?", i: "Assess practical {tech1} knowledge in the context of {domain} development.", a: "State management in {tech1} depends on application complexity. For simple apps, use local state and prop drilling. For {domain} features with shared state, consider Context API, Redux, or Zustand. Key patterns include normalizing state, avoiding unnecessary re-renders with memoization, and using custom hooks for reusable logic." },
    { q: "Describe your approach to handling asynchronous operations and error boundaries in {tech1}.", i: "Evaluate understanding of {tech1} async patterns and error handling.", a: "Use async/await with try-catch for clean async code. Implement error boundaries to catch rendering errors. Use Promise.allSettled for parallel operations. For {domain} applications, implement retry logic with exponential backoff and proper loading states." },
    { q: "What are the most common performance pitfalls in {tech1} and how do you avoid them?", i: "Test deep {tech1} optimization knowledge.", a: "Common pitfalls: unnecessary re-renders (fix with useMemo/useCallback), large bundle sizes (fix with code splitting), memory leaks from uncanceled subscriptions, and blocking the main thread with heavy computations. Use the {tech1} profiler, lazy loading, and Web Workers for CPU-intensive tasks." },
    { q: "How would you structure a large-scale {tech1} codebase for a {domain} product?", i: "Assess architectural thinking with {tech1}.", a: "Use feature-based folder structure (by domain rather than by type). Implement a clear separation of concerns: UI components, business logic (hooks/services), and data access layer. Use TypeScript for type safety, establish coding standards with ESLint/Prettier, and implement a consistent testing strategy." }
  ],
  typescript: [
    { q: "How do you use TypeScript generics and utility types to build type-safe {domain} APIs?", i: "Evaluate advanced {tech1} knowledge for {domain} development.", a: "Generics enable reusable, type-safe components and API clients. Use utility types like Partial, Pick, Omit for DTOs. Create custom generic interfaces for API responses. Use discriminated unions for handling different response types. Enforce strict null checks and noImplicitAny for maximum type safety." },
    { q: "What is your strategy for migrating a large {tech2} codebase to {tech1}?", i: "Test practical {tech1} migration experience.", a: "Migrate incrementally: start with allowing JS files, add types to new files first, use the 'any' type temporarily for complex migrations. Set up tsconfig with strict mode gradually. Use TypeScript's --allowJs flag during transition. Prioritize critical paths and public APIs first." }
  ],
  react: [
    { q: "How do you optimize React component re-renders in a complex {domain} application?", i: "Assess React performance optimization skills.", a: "Use React.memo for pure components, useMemo for expensive computations, useCallback for stable function references. Implement virtual lists for large datasets (react-window). Use the React DevTools Profiler to identify unnecessary renders. Consider state management libraries like Zustand for fine-grained updates." },
    { q: "Describe your approach to form handling and validation in React for {domain} features.", i: "Evaluate React form management patterns.", a: "Use controlled components for simple forms, or libraries like React Hook Form for complex ones. Implement schema validation with Zod or Yup. Handle form state at the appropriate level — local for self-contained forms, global for multi-step wizards. Consider server-side validation as a second layer." },
    { q: "How do you handle routing, code splitting, and lazy loading in a React {domain} application?", i: "Test React architecture and performance knowledge.", a: "Use React Router for routing with lazy-loaded route components via React.lazy(). Split code by route and by feature. Implement loading states with Suspense fallbacks. Preload critical routes with <link rel='prefetch'>. For {domain} apps, consider route-based data fetching patterns." }
  ],
  node: [
    { q: "How do you design a scalable {tech1} API for a {domain} service?", i: "Assess {tech1} API design and scalability knowledge.", a: "Use a layered architecture: routes → controllers → services → data access. Implement middleware for auth, validation, error handling, and logging. Use connection pooling for databases. Implement rate limiting, caching (Redis), and pagination. Consider horizontal scaling with PM2 clustering or containerization." },
    { q: "What is your approach to error handling and logging in production {tech1} applications?", i: "Evaluate production-ready {tech1} practices.", a: "Use a centralized error handler middleware. Create custom error classes (AppError, NotFoundError, ValidationError). Use structured logging (Winston/Morgan) with log levels. Implement error tracking with Sentry. Never expose internal errors to clients. Use async/await with try-catch consistently." }
  ],
  python: [
    { q: "How do you design and structure a {domain} application using {tech1}?", i: "Assess {tech1} architecture for {domain} development.", a: "Follow a clean architecture pattern: separate concerns into models, views/services, and controllers. Use virtual environments or Poetry for dependency management. Implement proper logging, configuration management, and error handling. Use type hints for better code quality and IDE support." },
    { q: "What are the key differences between synchronous and asynchronous {tech1}, and when would you use each?", i: "Evaluate {tech1} async programming knowledge.", a: "Synchronous {tech1} (Flask, Django) is simpler and sufficient for CPU-bound or low-concurrency apps. Asynchronous {tech1} (FastAPI, asyncio) excels at I/O-bound operations like API calls and database queries. Async can handle thousands of concurrent connections but requires async-compatible libraries throughout the stack." }
  ],
  sql: [
    { q: "How would you design a database schema for a {domain} application? What normalization level would you target?", i: "Assess database design skills for {domain} context.", a: "Start with entity-relationship modeling. Normalize to 3NF to eliminate redundancy, then denormalize strategically for read-heavy {domain} queries. Use appropriate data types, add indexes on foreign keys and frequently queried columns. Implement soft deletes and audit columns (created_at, updated_at). Consider read replicas for scaling." },
    { q: "How do you optimize slow queries in a production {tech1} database?", i: "Test {tech1} performance tuning skills.", a: "Use EXPLAIN ANALYZE to identify bottlenecks. Add composite indexes matching query patterns. Avoid N+1 queries with JOINs or batch loading. Use covering indexes for frequently accessed columns. Consider partitioning for large tables. Cache frequent query results. Monitor slow query logs regularly." }
  ],
  aws: [
    { q: "How would you architect a {domain} application on AWS for high availability?", i: "Assess AWS architecture knowledge for {domain} systems.", a: "Deploy across multiple AZs using Auto Scaling groups or ECS/EKS. Use Application Load Balancer for traffic distribution. Store static assets in S3 with CloudFront CDN. Use RDS with read replicas or DynamoDB for data. Implement monitoring with CloudWatch and alarms. Use IAM roles for least-privilege access. Set up CI/CD with CodePipeline." },
    { q: "What AWS services would you use for a serverless {domain} backend and why?", i: "Evaluate serverless AWS architecture knowledge.", a: "API Gateway for REST/GraphQL APIs, Lambda for compute, DynamoDB for NoSQL data, S3 for file storage, CloudFront for CDN, SNS/SQS for messaging, and Step Functions for workflows. Benefits: no server management, auto-scaling, pay-per-use. Trade-offs: cold starts, execution time limits, vendor lock-in." }
  ],
  docker: [
    { q: "How do you containerize a {domain} application with {tech1} for production?", i: "Assess {tech1} production deployment knowledge.", a: "Use multi-stage builds to minimize image size. Use Alpine or distroless base images. Run as non-root user. Implement health checks. Use .dockerignore to exclude unnecessary files. Set environment variables for configuration. Use docker-compose for local development and orchestration tools for production." },
    { q: "What is your strategy for managing {tech1} images, secrets, and orchestration?", i: "Evaluate {tech1} lifecycle and security practices.", a: "Store images in a private registry (ECR, Docker Hub). Use Docker secrets or external secret managers (Vault, AWS Secrets Manager). Orchestrate with Kubernetes or Docker Compose depending on scale. Implement rolling updates, health checks, and auto-scaling policies." }
  ],
  git: [
    { q: "Describe your Git workflow for team collaboration on a {domain} project.", i: "Assess Git collaboration practices.", a: "Use GitFlow or trunk-based development depending on team size. Feature branches with descriptive names. Write meaningful commit messages following conventional commits. Use pull requests with code reviews. Squash merge for clean history. Protect main branch with required reviews and CI checks." },
    { q: "How do you handle merge conflicts and maintain a clean Git history?", i: "Evaluate Git conflict resolution skills.", a: "Rebase frequently onto main to stay current. Use git rerere to remember conflict resolutions. Communicate with team members when conflicts arise on shared files. Use interactive rebase to clean up commits before merging. Resolve conflicts by understanding both changes, not just accepting one side." }
  ],
  testing: [
    { q: "What is your testing strategy for a {domain} application? How do you balance unit, integration, and E2E tests?", i: "Assess testing approach for {domain} systems.", a: "Follow the testing pyramid: 70% unit tests (fast, isolated), 20% integration tests (API, database), 10% E2E tests (critical user flows). Use Jest/Vitest for unit testing, Supertest for API tests, and Cypress/Playwright for E2E. Mock external services. Test edge cases and error paths, not just happy paths." },
    { q: "How do you implement CI/CD testing for a {domain} project?", i: "Evaluate automated testing pipeline knowledge.", a: "Set up CI pipeline to run tests on every PR: linting → unit tests → integration tests → build. Use parallel test execution for speed. Run E2E tests on staging before production deployment. Implement test coverage thresholds. Use preview deployments for each PR. Gate merges on passing tests." }
  ],
  microservices: [
    { q: "How would you design communication between {tech1_lower} services in a {domain} system?", i: "Assess microservices architecture knowledge.", a: "Use synchronous communication (REST/gRPC) for request-response patterns and asynchronous (message queues like RabbitMQ/Kafka) for event-driven workflows. Implement API gateway for client-facing aggregation. Use service discovery, circuit breakers, and retry patterns. Ensure each service owns its data." },
    { q: "What are the key challenges of {tech1} architecture and how do you address them?", i: "Evaluate microservices trade-off knowledge.", a: "Challenges: distributed tracing, data consistency, deployment complexity, network latency. Solutions: implement centralized logging and tracing (Jaeger), use saga pattern for distributed transactions, containerize for consistent deployments, use API gateway for routing and rate limiting." }
  ],
  security: [
    { q: "How do you implement authentication and authorization in a {domain} application?", i: "Assess security implementation knowledge.", a: "Use JWT or session-based auth depending on requirements. Implement OAuth 2.0 / OpenID Connect for third-party auth. Use RBAC or ABAC for authorization. Hash passwords with bcrypt/argon2. Implement rate limiting on auth endpoints. Use HTTPS everywhere. Store secrets in environment variables or secret managers." },
    { q: "What security measures do you implement to protect a {domain} API?", i: "Evaluate API security practices.", a: "Input validation and sanitization, parameterized queries (prevent SQL injection), CORS configuration, rate limiting, authentication tokens, HTTPS, security headers (CSP, HSTS), regular dependency audits, and security testing (SAST/DAST). Log security events without exposing sensitive data." }
  ],
  performance: [
    { q: "How do you identify and fix performance bottlenecks in a {domain} application?", i: "Assess performance optimization methodology.", a: "Profile first: use browser DevTools, APM tools (New Relic, Datadog), and database query analysis. Identify the bottleneck (CPU, memory, I/O, network). Apply targeted optimizations: caching, lazy loading, query optimization, code splitting, CDN usage. Measure impact before and after. Set performance budgets." },
    { q: "What strategies do you use to optimize load times for a {domain} web application?", i: "Test web performance optimization knowledge.", a: "Minimize bundle size (tree shaking, code splitting), use image optimization (WebP, lazy loading), implement CDN caching, enable compression (gzip/brotli), use HTTP/2 or HTTP/3, prefetch critical resources, reduce CSS complexity, and implement service workers for offline caching." }
  ],
  system_design: [
    { q: "How would you design a system that handles {tech1} at scale for a {domain} product?", i: "Assess system design and scalability thinking.", a: "Start with requirements: estimate QPS, storage, bandwidth. Design for horizontal scaling. Use load balancers, caching layers (Redis/CDN), database sharding/replication. Implement async processing for non-critical operations. Design for failure: retries, circuit breakers, graceful degradation." },
    { q: "What trade-offs would you consider when choosing between consistency and availability in a {domain} system?", i: "Evaluate distributed systems knowledge.", a: "CAP theorem: you can only guarantee 2 of 3 (Consistency, Availability, Partition Tolerance). For financial {domain} systems, prioritize consistency. For social/content platforms, prioritize availability. Use eventual consistency with conflict resolution. Consider the business impact of stale data vs downtime." }
  ],
  data_structures: [
    { q: "How do you approach algorithm optimization for {domain} problems?", i: "Assess algorithmic thinking.", a: "Analyze time and space complexity. Choose appropriate data structures (hash maps for O(1) lookups, trees for sorted data, graphs for relationships). Use dynamic programming for overlapping subproblems. Consider trade-offs between readability and performance. Profile before optimizing." },
    { q: "Describe a situation where you had to optimize a slow algorithm or data structure in production.", i: "Evaluate practical optimization experience.", a: "Identify the bottleneck through profiling. Replace O(n²) with O(n log n) or O(n) algorithms. Use appropriate data structures (set for deduplication, map for lookups). Implement caching for repeated computations. Consider batch processing for large datasets. Measure improvement with benchmarks." }
  ],
  agile: [
    { q: "How do you estimate and plan work in an {tech1} team?", i: "Assess Agile planning practices.", a: "Use story points or time-based estimation. Break epics into user stories with acceptance criteria. Participate in sprint planning, daily standups, and retrospectives. Use velocity tracking for capacity planning. Consider dependencies and risks when committing to sprint goals." },
    { q: "How do you handle changing requirements mid-sprint in an {tech1} environment?", i: "Evaluate Agile adaptability.", a: "Assess impact on sprint goals. Discuss with product owner and team. If critical, swap out lower-priority work. Document the change and its rationale. Learn from it in retrospective — frequent mid-sprint changes may indicate inadequate upfront planning or unclear requirements." }
  ],
  devops: [
    { q: "How do you set up monitoring and alerting for a {domain} production system?", i: "Assess observability knowledge.", a: "Implement the three pillars: metrics (Prometheus, CloudWatch), logs (ELK, CloudWatch Logs), and traces (Jaeger, X-Ray). Set up dashboards for key metrics (latency, error rate, throughput, saturation). Configure alerts with appropriate thresholds and avoid alert fatigue. Use synthetic monitoring for critical user flows." },
    { q: "Describe your CI/CD pipeline setup for a {domain} application.", i: "Evaluate deployment automation knowledge.", a: "Source control triggers CI pipeline → lint → test → build → security scan → deploy to staging → E2E tests → manual approval → deploy to production. Use infrastructure as code (Terraform). Implement blue-green or canary deployments. Rollback automatically on failure." }
  ],
  rest: [
    { q: "How do you design RESTful APIs for a {domain} service?", i: "Assess API design principles.", a: "Follow REST conventions: resource-based URLs (POST /users, GET /users/:id), proper HTTP methods and status codes. Use versioning (URL or header). Implement pagination, filtering, and sorting. Use HATEOAS for discoverability. Document with OpenAPI/Swagger. Validate all inputs. Return consistent error formats." },
    { q: "How do you handle API versioning and backward compatibility?", i: "Evaluate API lifecycle management.", a: "Use URL versioning (/v1/, /v2/) for major changes. Maintain backward compatibility by adding optional fields rather than removing them. Deprecate old versions with sunset headers and migration guides. Keep old versions running for a transition period. Use feature flags for gradual rollouts." }
  ],
  graphql: [
    { q: "When would you choose GraphQL over REST for a {domain} application?", i: "Assess API technology decision-making.", a: "Choose GraphQL when: clients need flexible data fetching, multiple clients with different data needs, reducing over-fetching/under-fetching, real-time data with subscriptions. Choose REST for: simple CRUD, caching needs, simpler architecture, or when the team lacks GraphQL experience." },
    { q: "How do you handle N+1 query problems in GraphQL?", i: "Evaluate GraphQL performance optimization.", a: "Use DataLoader to batch and cache database queries. Implement query complexity analysis to prevent expensive queries. Use query depth limiting. Implement pagination for large result sets. Cache resolver results. Monitor query performance and set execution time limits." }
  ],
  kubernetes: [
    { q: "How do you deploy and manage a {domain} application on {tech1}?", i: "Assess {tech1} orchestration knowledge.", a: "Define deployments, services, and ingress resources. Use ConfigMaps and Secrets for configuration. Implement resource requests and limits. Set up horizontal pod autoscaling. Use Helm charts for packaging. Implement health checks (liveness/readiness probes). Use namespaces for environment isolation." }
  ],
  redis: [
    { q: "How do you use {tech1} for caching in a {domain} application?", i: "Evaluate caching strategy knowledge.", a: "Cache frequently accessed data with appropriate TTL. Use cache-aside pattern: check cache first, load from DB if miss. Implement cache invalidation on data changes. Use Redis data structures (strings, hashes, sorted sets) appropriately. Monitor cache hit rates. Handle cache stampedes with locks or probabilistic early expiration." }
  ],
  linux: [
    { q: "How do you debug and troubleshoot issues on a {tech1} production server?", i: "Assess Linux systems troubleshooting skills.", a: "Check logs (journalctl, /var/log), monitor resources (top, htop, vmstat, iostat), check network (netstat, ss, tcpdump), analyze processes (ps, strace). Use grep for log searching. Set up log rotation. Implement monitoring and alerting before issues become critical." }
  ],
  terraform: [
    { q: "How do you manage infrastructure as code with {tech1} for a {domain} project?", i: "Evaluate IaC practices.", a: "Organize code into modules for reusability. Use remote state (S3 + DynamoDB) for team collaboration. Implement plan/apply workflow with PR reviews. Use workspaces for environments. Pin provider versions. Test infrastructure with terratest. Implement drift detection." }
  ],
  websocket: [
    { q: "How do you implement real-time features with {tech1} in a {domain} application?", i: "Assess real-time communication knowledge.", a: "Use WebSockets for bidirectional communication. Implement connection management (reconnect logic, heartbeat/ping-pong). Use a message broker (Redis Pub/Sub) for scaling across servers. Handle authentication during WebSocket handshake. Implement fallback to long-polling for older clients. Manage backpressure." }
  ],
  sass: [
    { q: "How do you structure and maintain CSS at scale for a {domain} application?", i: "Assess CSS architecture knowledge.", a: "Use a methodology (BEM, CSS Modules, or styled-components). Implement a design token system for colors, spacing, typography. Use CSS custom properties for theming. Implement responsive design with mobile-first media queries. Use linting (stylelint) and automated visual regression testing." }
  ],
  webpack: [
    { q: "How do you optimize build times and bundle size for a {domain} application?", i: "Evaluate build tool optimization knowledge.", a: "Use code splitting, tree shaking, and dynamic imports. Analyze bundles with webpack-bundle-analyzer. Implement caching (content hashing). Use production mode optimizations: minification, compression, scope hoisting. Consider migrating to Vite for faster dev server. Parallelize builds." }
  ],
  machine_learning: [
    { q: "How would you integrate {tech1} models into a {domain} product?", i: "Assess ML integration knowledge.", a: "Start with a pre-trained model or transfer learning. Build a prediction API service. Implement model versioning and A/B testing. Monitor model drift in production. Use batch prediction for offline tasks and real-time inference for interactive features. Implement feature stores for consistent feature engineering." }
  ],
  serverless: [
    { q: "How do you design a {tech1} {domain} backend? What are the limitations?", i: "Evaluate serverless architecture knowledge.", a: "Use functions as microservices. Design for statelessness — use external storage for state. Handle cold starts with provisioned concurrency or warm-up strategies. Set appropriate timeout and memory limits. Use step functions for complex workflows. Monitor with distributed tracing. Trade-offs: vendor lock-in, cold starts, execution limits." }
  ],
  mobile: [
    { q: "How do you optimize performance and user experience in a {tech1} {domain} app?", i: "Assess mobile development knowledge.", a: "Optimize list rendering with virtualization. Minimize bridge communication in cross-platform frameworks. Implement offline-first with local storage. Use native modules for performance-critical features. Optimize images and assets. Implement proper error handling and loading states. Test on real devices across OS versions." }
  ],
  java: [
    { q: "How do you design a scalable {tech1} {domain} service?", i: "Assess {tech1} architecture knowledge.", a: "Use Spring Boot for rapid development. Implement layered architecture. Use Spring Data for database access. Implement circuit breakers with Resilience4j. Use async processing with CompletableFuture. Containerize with Docker. Monitor with Actuator endpoints. Implement proper exception handling and validation." }
  ],
  go: [
    { q: "How do you leverage Go's concurrency model for a {domain} service?", i: "Evaluate Go concurrency knowledge.", a: "Use goroutines for lightweight concurrent execution. Use channels for communication between goroutines. Implement worker pools for bounded concurrency. Use context for cancellation and timeouts. Use sync primitives (Mutex, WaitGroup) carefully. Profile with pprof to identify goroutine leaks." }
  ],
  angular: [
    { q: "How do you manage state and performance in an {tech1} {domain} application?", i: "Assess {tech1} architecture knowledge.", a: "Use NgRx or Angular services for state management. Implement OnPush change detection for performance. Use lazy loading for feature modules. Track observables with async pipe to prevent memory leaks. Use Angular's built-in optimization ( Ahead-of-Time compilation). Implement proper dependency injection." }
  ],
  vue: [
    { q: "How do you structure a large-scale {tech1} {domain} application?", i: "Evaluate {tech1} architecture knowledge.", a: "Use Vue Router for routing, Pinia/Vuex for state management. Organize by feature/domain. Use composition API for reusable logic. Implement lazy loading for routes and components. Use TypeScript for type safety. Set up ESLint and Prettier for code quality." }
  ],
  csharp: [
    { q: "How do you build a scalable {tech1} {domain} API?", i: "Assess {tech1} backend knowledge.", a: "Use ASP.NET Core with dependency injection. Implement repository pattern for data access. Use Entity Framework Core with proper query optimization. Implement middleware for cross-cutting concerns. Use async/await throughout. Implement health checks and OpenAPI documentation. Containerize with Docker." }
  ],
  rust: [
    { q: "How do you leverage Rust's ownership model for building safe {domain} systems?", i: "Evaluate Rust systems knowledge.", a: "Ownership prevents data races at compile time. Use borrow checker rules to manage memory without GC. Use Arc/Mutex for shared state. Leverage pattern matching for error handling. Use async runtime (Tokio) for I/O. Write comprehensive tests. Use Cargo for dependency management." }
  ],
  ruby: [
    { q: "How do you design a {tech1} on Rails {domain} application for maintainability?", i: "Assess {tech1} architecture knowledge.", a: "Follow convention over configuration. Use fat models, skinny controllers. Implement service objects for complex business logic. Use background jobs (Sidekiq) for async tasks. Write comprehensive tests (RSpec). Use database migrations for schema changes. Implement proper error handling and logging." }
  ],
  php: [
    { q: "How do you build a modern {tech1} {domain} application with {tech2}?", i: "Evaluate {tech1} modern practices.", a: "Use Composer for dependency management. Follow PSR standards. Implement MVC architecture. Use Eloquent ORM for database access. Implement middleware for auth and validation. Use queues for background processing. Write tests with PHPUnit. Deploy with zero-downtime strategies." }
  ],
  elasticsearch: [
    { q: "How do you implement full-text search with {tech1} for a {domain} application?", i: "Assess search implementation knowledge.", a: "Design proper mappings and analyzers for the data. Use appropriate field types (text for full-text, keyword for exact match). Implement synonym and fuzziness for better search experience. Use aggregations for faceted search. Monitor cluster health. Implement proper indexing strategy for real-time updates." }
  ]
};

const BEHAVIORAL_TEMPLATES = [
  { q: "Tell me about a time you had to learn {tech1} quickly for a {domain} project. How did you approach it?", i: "Evaluate adaptability and learning speed with {tech1}.", a: "Describe the context where {tech1} was needed, your learning strategy (documentation, tutorials, building small prototypes), how you applied it to the {domain} project, and the outcome. Emphasize systematic learning, resourcefulness, and measurable results." },
  { q: "Describe a situation where you disagreed with a team member about a {domain} technical decision involving {tech1}. How did you resolve it?", i: "Test conflict resolution and technical communication.", a: "Explain the disagreement context, how you presented your perspective with data/evidence, how you listened to the other viewpoint, and how you reached a resolution (compromise, proof-of-concept, or escalation). Focus on collaboration and best outcome for the project." },
  { q: "Tell me about the most challenging {domain} bug you've debugged. What was your process?", i: "Assess debugging methodology and persistence.", a: "Describe the bug's impact, your systematic approach (reproducing, isolating, checking logs, forming hypotheses), the root cause discovery, the fix, and preventive measures added. Use STAR format. Show analytical thinking and thoroughness." },
  { q: "Describe a {domain} project where you took ownership beyond your assigned role.", i: "Evaluate leadership and initiative.", a: "Explain the project context, what additional responsibilities you took on, why they were needed, how you managed them alongside your core work, and the positive impact on the team or product." },
  { q: "Tell me about a time you had to make a technical trade-off in a {domain} project. What did you choose and why?", i: "Assess decision-making and prioritization.", a: "Describe the situation, the options available, the criteria you used to evaluate (time, quality, cost, risk), the decision you made, and the outcome. Show ability to make pragmatic decisions under constraints." },
  { q: "How do you handle receiving critical feedback on your {domain} code during code review?", i: "Test openness to feedback and growth mindset.", a: "View feedback as a learning opportunity, not personal criticism. Ask clarifying questions, understand the reasoning behind suggestions, implement changes thoughtfully, and thank the reviewer. Use feedback to improve coding standards over time." },
  { q: "Describe a time when a {domain} project deadline was at risk. What did you do?", i: "Evaluate crisis management and communication.", a: "Identify the risk early, communicate proactively with stakeholders, re-prioritize features (must-have vs nice-to-have), rally the team, work efficiently (not just longer hours), and deliver the best possible outcome within constraints." },
  { q: "Tell me about a {domain} feature or system you built that you're proud of. Why?", i: "Gauge passion, technical ownership, and impact.", a: "Describe the feature's purpose and impact, your specific contributions, technical challenges overcome, what you learned, and why it matters. Show enthusiasm and explain the technical depth involved." },
  { q: "How do you balance writing clean, maintainable code with meeting tight {domain} deadlines?", i: "Assess pragmatism and quality mindset.", a: "Prioritize clean code for core/complex logic, accept temporary shortcuts for peripheral features with documented tech debt. Set aside time for refactoring. Use automated testing to enable fast, safe changes. Communicate trade-offs to stakeholders." },
  { q: "Describe how you've mentored or helped a junior team member grow in {domain} development.", i: "Evaluate knowledge sharing and leadership.", a: "Explain the mentoring approach: pair programming, code reviews with explanations, recommending resources, giving constructive feedback, creating a safe learning environment. Show specific examples of growth and impact." }
];

function getTechQuestionTemplate(techKey, domain, otherTechs) {
  const templates = TECH_QUESTION_TEMPLATES[techKey];
  if (!templates) return null;

  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 2);

  const otherTechDisplay = otherTechs.length > 0
    ? (TECH_DISPLAY[otherTechs[0]] || otherTechs[0])
    : "legacy";

  const questions = [];
  for (const template of selected) {
    let q = template.q
      .replace(/\{tech1\}/g, TECH_DISPLAY[techKey] || techKey)
      .replace(/\{tech2\}/g, otherTechDisplay)
      .replace(/\{tech1_lower\}/g, (TECH_DISPLAY[techKey] || techKey).toLowerCase())
      .replace(/\{domain\}/g, domain)
      .replace(/\s{2,}/g, ' ')
      .replace(/backend backend/gi, 'backend')
      .replace(/frontend frontend/gi, 'frontend')
      .replace(/legacy codebase to TypeScript/g, 'JavaScript codebase to TypeScript')
      .replace(/large System Design at scale/g, 'large-scale distributed systems')
      .replace(/handles System Design at scale/g, 'handles high-scale distributed systems')
      .replace(/a serverless Backend backend/gi, 'a serverless backend')
      .replace(/a serverless Frontend backend/gi, 'a serverless frontend');

    let i = template.i
      .replace(/\{tech1\}/g, TECH_DISPLAY[techKey] || techKey)
      .replace(/\{tech2\}/g, otherTechDisplay)
      .replace(/\{tech1_lower\}/g, (TECH_DISPLAY[techKey] || techKey).toLowerCase())
      .replace(/\{domain\}/g, domain)
      .replace(/\s{2,}/g, ' ')
      .replace(/backend backend/g, 'backend')
      .replace(/frontend frontend/g, 'frontend');

    let a = template.a
      .replace(/\{tech1\}/g, TECH_DISPLAY[techKey] || techKey)
      .replace(/\{tech2\}/g, otherTechDisplay)
      .replace(/\{tech1_lower\}/g, (TECH_DISPLAY[techKey] || techKey).toLowerCase())
      .replace(/\{domain\}/g, domain)
      .replace(/\s{2,}/g, ' ')
      .replace(/backend backend/g, 'backend')
      .replace(/frontend frontend/g, 'frontend');

    questions.push({ question: q, intention: i, answer: a });
  }
  return questions;
}

function generateDynamicTechnicalQuestions(jobTechs, candidateTechs, domain, level) {
  const questions = [];
  const usedKeys = new Set();

  const gaps = jobTechs.filter(t => !candidateTechs.includes(t));
  const overlaps = jobTechs.filter(t => candidateTechs.includes(t));

  // Priority 1: Questions about tech in JD that candidate has (depth)
  for (const tech of overlaps) {
    if (questions.length >= 6) break;
    const tq = getTechQuestionTemplate(tech, domain, [...jobTechs.filter(t => t !== tech)]);
    if (tq) {
      for (const q of tq) {
        if (!questions.find(eq => eq.question === q.question) && questions.length < 6) {
          questions.push(q);
          usedKeys.add(tech);
        }
      }
    }
  }

  // Priority 2: Questions about tech in JD that candidate lacks (gap assessment)
  for (const tech of gaps) {
    if (questions.length >= 8) break;
    const tq = getTechQuestionTemplate(tech, domain, []);
    if (tq) {
      for (const q of tq.slice(0, 1)) {
        if (!questions.find(eq => eq.question === q.question) && questions.length < 8) {
          questions.push(q);
          usedKeys.add(tech);
        }
      }
    }
  }

  // Priority 3: Role-level specific questions
  if (questions.length < 4) {
    const roleQuestions = getRoleLevelQuestions(level, domain, jobTechs);
    for (const q of roleQuestions) {
      if (!questions.find(eq => eq.question === q.question) && questions.length < 8) {
        questions.push(q);
      }
    }
  }

  // Priority 4: Fill with general engineering questions
  if (questions.length < 4) {
    const generalQuestions = getGeneralEngineeringQuestions(domain);
    for (const q of generalQuestions) {
      if (!questions.find(eq => eq.question === q.question) && questions.length < 8) {
        questions.push(q);
      }
    }
  }

  return questions.slice(0, 8);
}

function getRoleLevelQuestions(level, domain, jobTechs) {
  const techStr = jobTechs.length > 0 ? jobTechs.map(t => TECH_DISPLAY[t] || t).slice(0, 2).join(" and ") : "modern web";

  if (level === "junior") {
    return [
      { question: `What fundamentals of ${techStr} do you feel strongest in, and where are you still growing?`, intention: "Assess self-awareness and learning trajectory for junior level.", answer: "Be honest about strengths and growth areas. Show concrete examples of projects where you applied these skills. Demonstrate eagerness to learn, mention specific resources (courses, projects, mentors), and show understanding of fundamentals even if lacking production experience." },
      { question: `Describe a personal or academic project using ${techStr}. What did you learn from it?`, intention: "Evaluate hands-on experience and learning ability.", answer: "Walk through the project's purpose, your role, technologies used, challenges faced, and solutions implemented. Focus on what you learned, not just what you built. Show problem-solving process and growth mindset." },
      { question: `How do you approach learning a new ${techStr} concept or tool?`, intention: "Assess learning methodology and resourcefulness.", answer: "Start with official documentation, build small experiments, follow tutorials, join communities, read source code. Show a structured approach: understand the 'why' before the 'how', build something practical, and seek feedback." }
    ];
  }

  if (level === "senior") {
    return [
      { question: `How would you architect a large-scale ${domain} system using ${techStr} from scratch?`, intention: "Evaluate system design and architectural leadership.", answer: "Start with requirements gathering and constraints. Design for scalability, maintainability, and team velocity. Discuss technology choices with trade-offs. Address deployment, monitoring, security, and team onboarding. Show experience leading technical decisions." },
      { question: `Describe your approach to mentoring junior developers on ${techStr} best practices.`, intention: "Assess leadership and knowledge transfer abilities.", answer: "Pair programming, thorough code reviews with explanations, creating documentation and runbooks, establishing coding standards, conducting tech talks, and creating a safe environment for questions. Show specific examples of developer growth." },
      { question: `How do you balance technical debt with feature delivery in a ${domain} product?`, intention: "Evaluate strategic thinking and pragmatism.", answer: "Track tech debt in backlog, allocate 20% of sprint capacity for debt reduction, prioritize based on business impact, communicate trade-offs to stakeholders, and use automated testing to enable safe refactoring. Show understanding of business priorities." }
    ];
  }

  // Mid-level
  return [
    { question: `Describe your experience building production ${domain} features with ${techStr}.`, intention: "Assess practical production experience.", answer: "Discuss specific features built, technologies used, challenges overcome, and impact delivered. Show understanding of production concerns: testing, monitoring, performance, and user experience. Demonstrate ability to work independently." },
    { question: `How do you ensure the quality and reliability of your ${techStr} code before deployment?`, intention: "Evaluate quality assurance practices.", answer: "Write unit and integration tests, use linting and type checking, perform code reviews, test in staging environments, implement CI/CD checks, and monitor after deployment. Show systematic approach to quality." },
    { question: `Tell me about a time you had to debug a complex ${domain} issue. What was your methodology?`, intention: "Test debugging and problem-solving skills.", answer: "Reproduce the issue, check logs and metrics, isolate the component, form hypotheses, test them systematically, implement the fix, and add monitoring to prevent recurrence. Use specific tools and demonstrate analytical thinking." }
  ];
}

function getGeneralEngineeringQuestions(domain) {
  return [
    { question: `How do you stay current with evolving ${domain} development practices and technologies?`, intention: "Assess continuous learning and professional development.", answer: "Follow industry blogs, read engineering team blogs (Netflix, Airbnb, Stripe), attend conferences and meetups, contribute to open source, build side projects, participate in developer communities, and take online courses. Show specific examples of recent learning." },
    { question: `Describe your approach to code reviews. What do you look for and how do you give feedback?`, intention: "Evaluate collaboration and code quality mindset.", answer: "Review for correctness, readability, performance, security, and test coverage. Provide constructive, specific feedback with suggestions. Appreciate good patterns. Keep reviews focused and respectful. Balance nit-picks with important issues. Use automated tools for style checks." },
    { question: `How do you approach estimating effort for a new ${domain} feature?`, intention: "Test estimation and planning abilities.", answer: "Break down the feature into smaller tasks, identify unknowns and risks, account for testing and deployment effort, consider dependencies, use historical velocity as reference, and communicate uncertainty ranges rather than single-point estimates." },
    { question: `What steps do you take when designing a new ${domain} system or feature?`, intention: "Assess design thinking and methodology.", answer: "Understand requirements and constraints, research existing solutions, create architecture diagrams, consider scalability and edge cases, discuss with team, build a proof-of-concept if needed, iterate based on feedback, and document decisions." },
    { question: `How do you handle production incidents in a ${domain} system?`, intention: "Evaluate incident response and operational maturity.", answer: "Acknowledge immediately, assess impact, communicate with stakeholders, investigate root cause, implement fix or workaround, conduct post-mortem, implement preventive measures, and update runbooks. Focus on blameless culture and continuous improvement." }
  ];
}

function generateDynamicBehavioralQuestions(domain, jobTechs, level) {
  const questions = [];
  const techStr = jobTechs.length > 0 ? jobTechs.map(t => TECH_DISPLAY[t] || t).slice(0, 2).join(" and ") : "software development";
  const shuffled = [...BEHAVIORAL_TEMPLATES].sort(() => Math.random() - 0.5);

  for (const template of shuffled) {
    if (questions.length >= 5) break;

    let q = template.q
      .replace(/\{tech1\}/g, techStr)
      .replace(/\{domain\}/g, domain);

    let i = template.i
      .replace(/\{tech1\}/g, techStr)
      .replace(/\{tech2\}/g, jobTechs.length > 1 ? (TECH_DISPLAY[jobTechs[1]] || jobTechs[1]) : "the technology")
      .replace(/\{domain\}/g, domain);

    let a = template.a
      .replace(/\{tech1\}/g, techStr)
      .replace(/\{tech2\}/g, jobTechs.length > 1 ? (TECH_DISPLAY[jobTechs[1]] || jobTechs[1]) : "the technology")
      .replace(/\{domain\}/g, domain);

    // Check for duplicate questions
    if (!questions.find(eq => eq.question === q)) {
      questions.push({ question: q, intention: i, answer: a });
    }
  }

  return questions.slice(0, 5);
}

function generateDynamicSkillGaps(jobTechs, candidateTechs, jobDescription, candidateInfo) {
  const gaps = [];
  const usedSkills = new Set();

  // Tech gaps: in JD but not in resume
  for (const tech of jobTechs) {
    if (!candidateTechs.includes(tech)) {
      gaps.push({ skill: TECH_DISPLAY[tech] || tech, severity: "High" });
      usedSkills.add(tech);
    }
  }

  // Seniority gaps
  const jobPhrases = extractKeyPhrases(jobDescription, 15);
  const seniorityTerms = ["architecture", "design", "mentor", "lead", "strategy", "scale", "optimization", "performance", "security"];
  const candidateLower = (candidateInfo || '').toLowerCase();

  for (const term of seniorityTerms) {
    if (gaps.length >= 5) break;
    if (usedSkills.has(term)) continue;

    const inJob = jobPhrases.some(p => p.includes(term)) || jobDescription.toLowerCase().includes(term);
    const inCandidate = candidateLower.includes(term);

    if (inJob && !inCandidate) {
      gaps.push({
        skill: term.charAt(0).toUpperCase() + term.slice(1),
        severity: "Medium"
      });
      usedSkills.add(term);
    }
  }

  // Common skill gaps based on domain requirements
  const commonGaps = [
    { skill: "System Design", check: () => jobDescription.toLowerCase().includes("design") && !candidateLower.includes("system design") },
    { skill: "CI/CD Pipelines", check: () => jobDescription.toLowerCase().includes("ci/cd") || jobDescription.toLowerCase().includes("continuous") && !candidateLower.includes("ci/cd") && !candidateLower.includes("continuous") },
    { skill: "Testing & QA", check: () => jobDescription.toLowerCase().includes("test") && !candidateLower.includes("test") },
    { skill: "Performance Optimization", check: () => jobDescription.toLowerCase().includes("performance") && !candidateLower.includes("performance") },
    { skill: "Cloud Architecture", check: () => (jobDescription.toLowerCase().includes("cloud") || jobDescription.toLowerCase().includes("aws") || jobDescription.toLowerCase().includes("azure")) && !candidateLower.includes("cloud") },
    { skill: "Security Best Practices", check: () => jobDescription.toLowerCase().includes("security") && !candidateLower.includes("security") },
    { skill: "DevOps Practices", check: () => jobDescription.toLowerCase().includes("devops") && !candidateLower.includes("devops") },
    { skill: "Data Structures & Algorithms", check: () => jobDescription.toLowerCase().includes("algorithm") || jobDescription.toLowerCase().includes("data structure") && !candidateLower.includes("algorithm") && !candidateLower.includes("data structure") }
  ];

  for (const gap of commonGaps) {
    if (gaps.length >= 5) break;
    if (gap.check() && !usedSkills.has(gap.skill.toLowerCase())) {
      gaps.push({ skill: gap.skill, severity: "Medium" });
      usedSkills.add(gap.skill.toLowerCase());
    }
  }

  if (gaps.length === 0) {
    gaps.push(
      { skill: "System Design", severity: "Medium" },
      { skill: "Performance Optimization", severity: "Low" },
      { skill: "Testing & QA", severity: "Low" }
    );
  }

  return gaps.slice(0, 5);
}

function generateDynamicPreparationPlan(jobTechs, candidateTechs, skillGaps, domain) {
  const plan = [];
  const topics = [];

  // Priority: skill gaps first
  for (const gap of skillGaps) {
    const skillKey = Object.keys(TECH_DISPLAY).find(k => TECH_DISPLAY[k] === gap.skill);
    if (skillKey) {
      topics.push({ key: skillKey, priority: "high" });
    } else {
      topics.push({ key: gap.skill.toLowerCase().replace(/\s+/g, '_'), priority: gap.severity === "High" ? "high" : "medium" });
    }
  }

  // Then JD techs candidate doesn't have
  for (const tech of jobTechs) {
    if (!candidateTechs.includes(tech) && !topics.find(t => t.key === tech)) {
      topics.push({ key: tech, priority: "high" });
    }
  }

  // Then overlapping techs for depth
  for (const tech of candidateTechs) {
    if (jobTechs.includes(tech) && !topics.find(t => t.key === tech)) {
      topics.push({ key: tech, priority: "medium" });
    }
  }

  const taskMap = {
    javascript: ["Build 3 projects with modern ES6+ features", "Study closures, promises, event loop in depth", "Practice LeetCode JavaScript problems"],
    typescript: ["Convert a JS project to TypeScript", "Study advanced types, generics, and utility types", "Practice type-safe API client patterns"],
    react: ["Build a complete app with hooks and context", "Study performance optimization (memo, useMemo)", "Practice component design patterns"],
    node: ["Build a REST API with Express.js", "Study middleware, error handling, and security", "Implement JWT authentication and authorization"],
    python: ["Complete an advanced Python course", "Build a REST API with FastAPI/Flask", "Study decorators, generators, and async"],
    sql: ["Practice complex JOIN and subquery patterns", "Study indexing strategies and query optimization", "Design a database schema for a real project"],
    aws: ["Complete AWS Cloud Practitioner fundamentals", "Deploy an app to EC2 or Lambda", "Study IAM, S3, RDS, and VPC basics"],
    docker: ["Containerize an existing application", "Study multi-stage builds and optimization", "Learn Docker Compose for multi-container apps"],
    git: ["Practice advanced Git workflows (rebase, cherry-pick)", "Study Git hooks and automation", "Contribute to an open-source project"],
    testing: ["Write unit tests for an existing project", "Study mocking, test doubles, and TDD", "Set up CI pipeline with automated tests"],
    security: ["Complete a web security course (OWASP Top 10)", "Implement auth with JWT and OAuth", "Study common vulnerabilities and prevention"],
    performance: ["Profile and optimize a slow application", "Study caching strategies and CDNs", "Learn bundle analysis and code splitting"],
    system_design: ["Study system design fundamentals (Grokking)", "Practice designing Twitter, Uber, URL shortener", "Learn about load balancing, sharding, caching"],
    ci_cd: ["Set up GitHub Actions CI/CD pipeline", "Study deployment strategies (blue-green, canary)", "Implement automated testing in pipeline"],
    microservices: ["Build a simple microservices architecture", "Study API gateway and service discovery patterns", "Learn about distributed tracing and logging"],
    kubernetes: ["Complete Kubernetes fundamentals course", "Deploy an app with kubectl and manifests", "Study pods, services, deployments, and ingress"],
    redis: ["Implement Redis caching in an application", "Study data structures and eviction policies", "Learn Redis Pub/Sub for real-time features"],
    graphql: ["Build a GraphQL API with Apollo", "Study schema design and resolver patterns", "Implement DataLoader for N+1 prevention"],
    rest: ["Design and document a REST API with OpenAPI", "Study HTTP methods, status codes, and versioning", "Implement pagination, filtering, and rate limiting"],
    linux: ["Complete Linux fundamentals course", "Practice shell scripting and process management", "Learn system monitoring and troubleshooting"],
    devops: ["Set up monitoring with Prometheus and Grafana", "Study infrastructure as code (Terraform)", "Learn incident response and SRE practices"],
    websocket: ["Build a real-time chat application", "Study connection management and scaling", "Implement fallback mechanisms"],
    sass: ["Build a component library with CSS architecture", "Study CSS Grid, Flexbox, and responsive design", "Implement a design token system"],
    webpack: ["Optimize a webpack configuration", "Study code splitting and tree shaking", "Compare build tools (Vite, esbuild, Rollup)"],
    data_structures: ["Practice daily LeetCode problems", "Study trees, graphs, and dynamic programming", "Learn time/space complexity analysis"],
    serverless: ["Build a serverless API with AWS Lambda", "Study cold start optimization and patterns", "Learn Step Functions for workflows"],
    mobile: ["Build a cross-platform mobile app", "Study native module integration", "Optimize performance and bundle size"],
    java: ["Build a Spring Boot REST API", "Study Spring ecosystem and design patterns", "Practice Java concurrency and streams"],
    go: ["Build a concurrent Go service", "Study goroutines, channels, and interfaces", "Practice Go idioms and error handling"],
    angular: ["Build an Angular app with NgRx state management", "Study RxJS operators and observables", "Implement lazy loading and OnPush change detection"],
    vue: ["Build a Vue 3 app with Composition API", "Study Pinia for state management", "Implement TypeScript with Vue"],
    csharp: ["Build an ASP.NET Core API", "Study Entity Framework and LINQ", "Implement dependency injection patterns"],
    rust: ["Complete Rust basics (ownership, borrowing)", "Build a CLI tool or web service", "Practice async programming with Tokio"],
    ruby: ["Build a Rails API application", "Study ActiveRecord and migrations", "Implement background jobs with Sidekiq"],
    php: ["Build a Laravel application", "Study Eloquent ORM and middleware", "Implement testing with PHPUnit"],
    elasticsearch: ["Set up Elasticsearch for full-text search", "Study mappings, analyzers, and aggregations", "Implement search with relevance scoring"]
  };

  const focusMap = {
    javascript: "JavaScript Deep Dive", typescript: "TypeScript Mastery", react: "React Architecture",
    node: "Backend with Node.js", python: "Python Advanced Concepts", sql: "Database Design & Optimization",
    aws: "Cloud Infrastructure with AWS", docker: "Containerization with Docker", git: "Git Workflows",
    testing: "Testing Strategy & Implementation", security: "Web Security Fundamentals",
    performance: "Performance Optimization", system_design: "System Design Patterns",
    ci_cd: "CI/CD Pipeline Setup", microservices: "Microservices Architecture", kubernetes: "Kubernetes Orchestration",
    redis: "Caching with Redis", graphql: "GraphQL API Development", rest: "RESTful API Design",
    linux: "Linux & Shell Scripting", devops: "DevOps & Observability", websocket: "Real-Time Communication",
    sass: "CSS Architecture & Design Systems", webpack: "Build Tool Optimization",
    data_structures: "Data Structures & Algorithms", serverless: "Serverless Architecture",
    mobile: "Mobile App Development", java: "Java & Spring Boot", go: "Go Programming",
    angular: "Angular Framework", vue: "Vue.js Ecosystem", csharp: "C# & .NET Core",
    rust: "Rust Systems Programming", ruby: "Ruby on Rails", php: "PHP & Laravel",
    elasticsearch: "Search with Elasticsearch", agile: "Agile & Scrum Practices",
    machine_learning: "Machine Learning Integration", terraform: "Infrastructure as Code",
    blockchain: "Blockchain Development", _default: "Skill Development"
  };

  let day = 1;
  const usedTopics = new Set();

  for (const topic of topics.slice(0, 8)) {
    if (day > 10) break;

    const display = TECH_DISPLAY[topic.key] || topic.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const focus = focusMap[topic.key] || focusMap._default;
    const tasks = taskMap[topic.key] || [
      `Study ${display} fundamentals and best practices`,
      `Build a small project using ${display}`,
      `Practice ${display} interview questions`
    ];

    plan.push({ day, focus, tasks: tasks.slice(0, 3) });
    usedTopics.add(topic.key);
    day++;
  }

  // Fill remaining days
  const fillDays = [
    { focus: "Mock Interviews & Practice", tasks: ["Complete 2-3 mock interviews", "Review all technical questions", "Practice explaining solutions aloud"] },
    { focus: "Project Portfolio Review", tasks: ["Update GitHub with recent projects", "Document architecture decisions", "Prepare project walkthrough explanations"] },
    { focus: "Behavioral Interview Prep", tasks: ["Practice STAR format stories", "Prepare answers for top 10 behavioral questions", "Record and review practice answers"] },
    { focus: "Final Preparation", tasks: ["Review weak areas one more time", "Research the company and interviewers", "Prepare thoughtful questions to ask"] }
  ];

  for (const fill of fillDays) {
    if (day > 10) break;
    if (!plan.find(p => p.focus === fill.focus)) {
      plan.push({ day, ...fill });
      day++;
    }
  }

  return plan.slice(0, 10);
}

// ─── Main Report Generation ─────────────────────────────────────────────────

function generateFallbackReport(resume, selfDescription, jobDescription) {
  const candidateInfo = resume || selfDescription || '';

  const jobTechs = detectTechnologies(jobDescription);
  const candidateTechs = detectTechnologies(candidateInfo);
  const domain = detectDomain(jobDescription)[0];
  const level = detectRoleLevel(jobDescription);
  const keyPhrases = extractKeyPhrases(jobDescription);

  console.log(`[Fallback Engine] Detected: domain=${domain}, level=${level}, jobTechs=[${jobTechs.join(', ')}], candidateTechs=[${candidateTechs.join(', ')}]`);

  return {
    matchScore: calculateMatchScore(candidateInfo, jobDescription),
    technicalQuestions: generateDynamicTechnicalQuestions(jobTechs, candidateTechs, domain, level),
    behavioralQuestions: generateDynamicBehavioralQuestions(domain, jobTechs, level),
    skillGaps: generateDynamicSkillGaps(jobTechs, candidateTechs, jobDescription, candidateInfo),
    preparationPlan: generateDynamicPreparationPlan(jobTechs, candidateTechs,
      generateDynamicSkillGaps(jobTechs, candidateTechs, jobDescription, candidateInfo),
      domain
    )
  };
}

// ─── Ollama AI engine ──────────────────────────────────────────────────────

async function checkOllamaAvailable() {
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
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
    console.error("[Ollama] Failed to parse AI response, falling back to dynamic engine");
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

  if (normalized.technicalQuestions.length < 4 || normalized.behavioralQuestions.length < 3) {
    console.log("[Ollama] AI response incomplete, falling back to dynamic engine");
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
    } else {
      console.log("[Ollama] Not available or model not installed. Using dynamic fallback engine.");
    }

    const fallbackReport = generateFallbackReport(resume, selfDescription, jobDescription);
    console.log("[AI] Report generated using dynamic fallback engine");
    return fallbackReport;
  } catch (error) {
    console.error("[AI] Critical error, using fallback:", error.message);
    return generateFallbackReport(resume, selfDescription, jobDescription);
  }
}

module.exports = generateInterviewReport;
