import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box, Container, Typography, Divider, Chip, Link,
  Button, List, ListItem, Paper, Stack, CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Skills from './Skills';

// ── Parsing ───────────────────────────────────────────────────────────────────

function splitSections(md) {
  const sections = {};
  let current = '_header';
  const buffer = [];

  const flush = () => {
    sections[current] = buffer.join('\n').trim();
    buffer.length = 0;
  };

  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      flush();
      current = line.slice(3).trim();
    } else if (!line.startsWith('# ') && line.trim() !== '---') {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function parseSkillCategories(text) {
  return text.split('\n')
    .map(line => {
      const m = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
      if (!m) return null;
      const [, name, raw] = m;
      return { name, items: raw.split('|').map(s => s.trim()).filter(Boolean) };
    })
    .filter(Boolean);
}

function parseEducationRows(text) {
  return text.split('\n')
    .filter(l => l.trim().startsWith('|'))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .filter(cells => !cells.every(c => c === '' || /^-+$/.test(c)));
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <Box sx={{ mt: 3, mb: 1.5 }}>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: 'secondary.main', letterSpacing: 0.8, fontSize: '0.85rem' }}
      >
        {title.toUpperCase()}
      </Typography>
      <Divider sx={{ borderColor: 'secondary.main', mt: 0.5 }} />
    </Box>
  );
}

const MdLink = ({ href, children }) => (
  <Link href={href} target="_blank" rel="noopener noreferrer" sx={{ color: 'secondary.main' }}>
    {children}
  </Link>
);

// ── Section components ────────────────────────────────────────────────────────

function ResumeHeader({ text }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        Miles Raker
      </Typography>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              {children}
            </Typography>
          ),
          a: MdLink,
          strong: ({ children }) => (
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{children}</Box>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

function SkillsSection({ text }) {
  const categories = useMemo(() => parseSkillCategories(text), [text]);
  return (
    <Box>
      {categories.map(({ name, items }) => (
        <Box key={name} sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            {name}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.75 }}>
            {items.map(item => (
              <Chip
                key={item}
                label={item}
                size="small"
                sx={{ bgcolor: 'secondary.main', color: '#fff', fontSize: '0.7rem', height: 22 }}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

const experienceComponents = {
  a: MdLink,
  h3: ({ children }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2.5, mb: 0.25 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body2" sx={{ mb: 0.25, lineHeight: 1.6 }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <List sx={{ listStyleType: 'disc', pl: 2.5, py: 0, mt: 0.5 }}>
      {children}
    </List>
  ),
  li: ({ children }) => (
    <ListItem sx={{ display: 'list-item', py: 0.2, pl: 0 }}>
      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{children}</Typography>
    </ListItem>
  ),
  strong: ({ children }) => (
    <Box component="span" sx={{ fontWeight: 600 }}>{children}</Box>
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
};

function ExperienceSection({ text }) {
  return <ReactMarkdown components={experienceComponents}>{text}</ReactMarkdown>;
}

function EducationSection({ text }) {
  const rows = useMemo(() => parseEducationRows(text), [text]);
  return (
    <Box>
      {rows.map((cells, i) => {
        if (cells[0] && cells[0].startsWith('**')) {
          const institution = cells[0].replace(/\*\*/g, '');
          return (
            <Box key={i} sx={{ mt: i > 0 ? 1.5 : 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{institution}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 2, whiteSpace: 'nowrap' }}>
                  {cells[2]}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{cells[1]}</Typography>
            </Box>
          );
        }
        return (
          <Typography key={i} variant="body2" sx={{ color: 'text.secondary', pl: 1 }}>
            {cells[1]}
          </Typography>
        );
      })}
    </Box>
  );
}

function CertificationsSection({ text }) {
  const items = text.split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim());
  return (
    <List sx={{ listStyleType: 'disc', pl: 2.5, py: 0 }}>
      {items.map(item => (
        <ListItem key={item} sx={{ display: 'list-item', py: 0.2, pl: 0 }}>
          <Typography variant="body2">{item}</Typography>
        </ListItem>
      ))}
    </List>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Resume() {
  const [mdText, setMdText] = useState('');

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/resume.md')
      .then(r => r.text())
      .then(setMdText);
  }, []);

  const sections = useMemo(() => (mdText ? splitSections(mdText) : null), [mdText]);

  if (!sections) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<DownloadIcon />}
          href={process.env.PUBLIC_URL + '/resume.pdf'}
          download="Miles_Raker_Resume.pdf"
        >
          Download PDF
        </Button>
      </Box>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
        <ResumeHeader text={sections['_header'] || ''} />
        <SectionHeader title="Profile" />
        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
          {sections['Profile']}
        </Typography>
        <SectionHeader title="Technical Skills" />
        <SkillsSection text={sections['Technical Skills'] || ''} />
        <Skills />
        <SectionHeader title="Professional Experience" />
        <ExperienceSection text={sections['Professional Experience'] || ''} />
        <SectionHeader title="Education" />
        <EducationSection text={sections['Education'] || ''} />
        <SectionHeader title="Certifications" />
        <CertificationsSection text={sections['Certifications'] || ''} />
      </Paper>
    </Container>
  );
}
