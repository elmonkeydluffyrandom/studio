import type { JournalEntry } from './types';

export let mockEntries: JournalEntry[] = [
  {
    id: '1',
    bibleReference: 'Salmos 23:1-3',
    verseText:
      'Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; Junto a aguas de reposo me pastoreará. Confortará mi alma; Me guiará por sendas de justicia por amor de su nombre.',
    observation: 'El salmista David expresa una profunda confianza en la provisión y guía de Dios. Lo ve como un pastor que cuida a sus ovejas, asegurándose de que tengan todo lo que necesitan: descanso, alimento, y dirección.',
    teaching: 'La soberanía y el cuidado amoroso de Dios son temas centrales. No es un Dios distante, sino uno personal e íntimo que se involucra en los detalles de nuestra vida. La confianza en Él disipa el temor a la carencia.',
    application: 'Hoy, en medio de la incertidumbre laboral, recordaré que Dios es mi pastor. En lugar de preocuparme, descansaré en Su promesa de provisión y buscaré Su guía para los siguientes pasos. Me comprometo a pasar tiempo en oración y gratitud por su cuidado.',
    tags: ['Confianza', 'Provisión', 'Paz'],
    createdAt: new Date('2024-07-20T10:00:00Z').toISOString(),
  },
  {
    id: '2',
    bibleReference: 'Filipenses 4:13',
    verseText: 'Todo lo puedo en Cristo que me fortalece.',
    observation: 'Pablo escribe esta carta desde la prisión. A pesar de sus circunstancias difíciles, declara que su fortaleza no proviene de su propia capacidad, sino de su relación con Cristo. Ha aprendido a estar contento en cualquier situación, ya sea en la abundancia o en la escasez.',
    teaching: 'La verdadera fortaleza y el contentamiento no dependen de las circunstancias externas, sino de una fuente interna y espiritual: Cristo. Esta fortaleza nos capacita para enfrentar cualquier desafío.',
    application: 'Enfrento un desafío familiar complicado. Me siento débil y sin respuestas. Hoy meditaré en esta verdad: mi capacidad es limitada, pero la fortaleza de Cristo en mí es ilimitada. Le pediré que me fortalezca para amar y actuar con sabiduría en esta situación.',
    tags: ['Fortaleza', 'Cristo', 'Desafíos', 'Familia'],
    createdAt: new Date('2024-07-19T15:30:00Z').toISOString(),
  },
  {
    id: '3',
    bibleReference: 'Proverbios 3:5-6',
    verseText: 'Fíate de Jehová de todo tu corazón, Y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, Y él enderezará tus veredas.',
    observation: 'Salomón contrasta la confianza en Dios con la confianza en el entendimiento humano. La instrucción es clara: una dependencia total en Dios en todas las áreas de la vida.',
    teaching: 'La sabiduría humana es limitada y falible. La verdadera dirección y el éxito en la vida provienen de someter nuestros planes y decisiones a la soberanía y sabiduría de Dios. Reconocerlo no es solo un acto intelectual, sino una práctica diaria de consulta y obediencia.',
    application: 'Estoy planeando un cambio de carrera. Es fácil apoyarme solo en mi investigación y análisis. Me comprometo a orar específicamente sobre cada paso del proceso, pidiendo a Dios que Él dirija mis decisiones y me muestre el camino que debo seguir, incluso si es diferente a lo que yo había pensado.',
    tags: ['Sabiduría', 'Decisiones', 'GuíaDivina'],
    createdAt: new Date('2024-07-18T08:45:00Z').toISOString(),
  },
];
