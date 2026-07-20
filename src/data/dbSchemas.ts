export interface FieldDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  refTable?: string;
  description: string;
}

export interface TableDef {
  id: string;
  name: string;
  dbType: 'SQLite (Prisma)' | 'KuzuDB (Graph DB)';
  category: 'Session & Uploads' | 'Entities & Graph' | 'Email Archive' | 'Workflows';
  description: string;
  fields: FieldDef[];
  sampleQuery: string;
}

export const DB_TABLES: TableDef[] = [
  {
    id: 'sessions',
    name: 'sessions',
    dbType: 'SQLite (Prisma)',
    category: 'Session & Uploads',
    description: 'Stores isolated analyst workspaces, layout settings, and filtering thresholds.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'Unique identifier for the session' },
      { name: 'createdAt', type: 'DateTime', description: 'Timestamp when session was initialized' },
      { name: 'expiresAt', type: 'DateTime', description: 'Expiration cutoff date' },
      { name: 'windowSize', type: 'Int (default: 400)', description: 'Sentence window size in characters for entity co-occurrences' },
      { name: 'minConnections', type: 'Int (default: 2)', description: 'Degree threshold filter setting' },
      { name: 'minOccurrences', type: 'Int (default: 2)', description: 'Frequency threshold filter setting' },
      { name: 'minEdgeWeight', type: 'Float (default: 0.0)', description: 'Minimum co-occurrence weight' },
      { name: 'hiddenNodeIds', type: 'String (JSON)', description: 'Array of entity IDs manually hidden by user' }
    ],
    sampleQuery: `SELECT * FROM sessions WHERE id = 'e8b7...';`
  },
  {
    id: 'files',
    name: 'files',
    dbType: 'SQLite (Prisma)',
    category: 'Session & Uploads',
    description: 'Catalog of uploaded documents (PDF, DOCX, EML, PNG) associated with a session.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'File primary key' },
      { name: 'sessionId', type: 'String', isFk: true, refTable: 'sessions', description: 'Foreign key to owner session' },
      { name: 'originalName', type: 'String', description: 'Original uploaded filename' },
      { name: 'storagePath', type: 'String (Unique)', description: 'Relative path on disk' },
      { name: 'mimeType', type: 'String', description: 'Detected MIME type (e.g. application/pdf)' },
      { name: 'sizeBytes', type: 'BigInt', description: 'File size in bytes' },
      { name: 'status', type: 'String', description: 'Ingestion status: PENDING, PROCESSING, SUCCESS, FAILED' },
      { name: 'uploadedAt', type: 'DateTime', description: 'Upload timestamp' }
    ],
    sampleQuery: `SELECT f.originalName, f.status, COUNT(o.id) as entityCount
FROM files f LEFT JOIN occurrences o ON f.id = o.fileId
WHERE f.sessionId = ? GROUP BY f.id;`
  },
  {
    id: 'entities',
    name: 'entities',
    dbType: 'SQLite (Prisma)',
    category: 'Entities & Graph',
    description: 'Global dictionary of unique named entities extracted across documents.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'Entity primary key' },
      { name: 'canonical', type: 'String', description: 'Normalized lowercased lookup key' },
      { name: 'displayName', type: 'String', description: 'Formatted string for UI display' },
      { name: 'type', type: 'String', description: 'Entity category (PERSON, ORG, LOC, EMAIL, PHONE, DATE...)' },
      { name: 'metadata', type: 'String (JSON)', description: 'JSON metadata attributes' }
    ],
    sampleQuery: `SELECT type, COUNT(*) FROM entities GROUP BY type ORDER BY COUNT(*) DESC;`
  },
  {
    id: 'occurrences',
    name: 'occurrences',
    dbType: 'SQLite (Prisma)',
    category: 'Entities & Graph',
    description: 'Relates entities to source files, recording frequency, TF-IDF, and text snippets.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'Occurrence primary key' },
      { name: 'entityId', type: 'String', isFk: true, refTable: 'entities', description: 'Foreign key to entity' },
      { name: 'fileId', type: 'String', isFk: true, refTable: 'files', description: 'Foreign key to file' },
      { name: 'count', type: 'Int', description: 'Frequency count within the document' },
      { name: 'tfidf', type: 'Float', description: 'Calculated statistical salience score' },
      { name: 'excerpts', type: 'String (JSON)', description: 'Extracted text sentences enclosing entity' }
    ],
    sampleQuery: `SELECT e.displayName, o.count, o.tfidf FROM occurrences o
JOIN entities e ON o.entityId = e.id WHERE o.fileId = ?;`
  },
  {
    id: 'entity_neighborhoods',
    name: 'entity_neighborhoods',
    dbType: 'SQLite (Prisma)',
    category: 'Entities & Graph',
    description: 'Textual co-occurrences connecting pairs of entities within sliding window snippets.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'Neighborhood record ID' },
      { name: 'fileId', type: 'String', isFk: true, refTable: 'files', description: 'Source document ID' },
      { name: 'sourceEntityId', type: 'String', isFk: true, refTable: 'entities', description: 'First co-occurring entity ID' },
      { name: 'targetEntityId', type: 'String', isFk: true, refTable: 'entities', description: 'Second co-occurring entity ID' },
      { name: 'weight', type: 'Float', description: 'Distance-decayed connection weight' },
      { name: 'snippet', type: 'String', description: 'Raw paragraph containing both entities' }
    ],
    sampleQuery: `SELECT snippet FROM entity_neighborhoods
WHERE sourceEntityId = ? AND targetEntityId = ?;`
  },
  {
    id: 'emails',
    name: 'emails',
    dbType: 'SQLite (Prisma)',
    category: 'Email Archive',
    description: 'Structured headers and text body extracted from .eml and .pst email files.',
    fields: [
      { name: 'id', type: 'String (UUID)', isPk: true, description: 'Email record ID' },
      { name: 'fileId', type: 'String', isFk: true, refTable: 'files', description: 'Source .eml file ID' },
      { name: 'subject', type: 'String', description: 'Email subject header' },
      { name: 'from', type: 'String', description: 'Sender email address' },
      { name: 'to', type: 'String', description: 'Recipient addresses' },
      { name: 'date', type: 'DateTime', description: 'Transmission timestamp' },
      { name: 'body', type: 'String', description: 'Plain text or HTML email body' }
    ],
    sampleQuery: `SELECT * FROM emails WHERE \`from\` LIKE '%@geode.science%' ORDER BY date DESC;`
  },
  {
    id: 'kuzu_entity',
    name: 'Entity Node',
    dbType: 'KuzuDB (Graph DB)',
    category: 'Entities & Graph',
    description: 'KuzuDB vertex table storing unique graph entity nodes.',
    fields: [
      { name: 'id', type: 'STRING (PK)', isPk: true, description: 'Entity node primary key' },
      { name: 'canonical', type: 'STRING', description: 'Normalized search term' },
      { name: 'display_name', type: 'STRING', description: 'Node label rendered on canvas' },
      { name: 'type', type: 'STRING', description: 'Entity classification (PERSON, ORG, LOC)' }
    ],
    sampleQuery: `MATCH (e:Entity {type: 'PERSON'}) RETURN e.display_name LIMIT 20;`
  },
  {
    id: 'kuzu_co_occurs',
    name: 'CO_OCCURS Edge',
    dbType: 'KuzuDB (Graph DB)',
    category: 'Entities & Graph',
    description: 'KuzuDB directed/undirected relationship table linking Entity to Entity.',
    fields: [
      { name: 'weight', type: 'DOUBLE', description: 'Co-occurrence strength score' },
      { name: 'distance', type: 'INT64', description: 'Token distance offset between entities' },
      { name: 'snippet', type: 'STRING', description: 'Contextual sentence excerpt' },
      { name: 'file_id', type: 'STRING', description: 'Source document reference ID' }
    ],
    sampleQuery: `MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity)
WHERE r.weight > 0.5 RETURN a.display_name, b.display_name, r.weight;`
  }
];
