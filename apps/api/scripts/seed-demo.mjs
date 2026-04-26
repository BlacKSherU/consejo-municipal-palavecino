/**
 * Genera SQL de demostración: borra datos de negocio y reinserta contenido ficticio
 * (noticias, consejo, gacetas, “Quiénes somos”, admin). Úsalo en entornos de prueba.
 *
 * Credenciales por defecto (cambialas con variables de entorno):
 *   SEED_DEMO_EMAIL    (default: admin@demo.cmp.test)
 *   SEED_DEMO_PASSWORD (default: DemoCmp2025!)
 *
 * Uso:
 *   node scripts/seed-demo.mjs           # solo imprime SQL y credenciales
 *   node scripts/seed-demo.mjs --write  # escribe apps/api/seed-demo.sql
 *   npx wrangler d1 execute cmp-db --local  --file=seed-demo.sql   # (desde apps/api)
 *   npx wrangler d1 execute cmp-db --remote --file=apps/api/seed-demo.sql  (desde la raíz del monorepo)
 *   Si aplica un seed-demo.sql desde la raíz, debe ser copia de apps/api/seed-demo.sql o apuntar a él.
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const ITERATIONS = 100_000;
const SALT_LEN = 16;
const KEY_LEN = 32;

function toB64(buf) {
  return Buffer.from(buf).toString("base64");
}

function hashPassword(plain) {
  const salt = randomBytes(SALT_LEN);
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, "sha256");
  return `pbkdf2:${ITERATIONS}:${toB64(salt)}:${toB64(hash)}`;
}

function q(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const writeFile = process.argv.includes("--write");

const email = (process.env.SEED_DEMO_EMAIL || "admin@demo.cmp.test").trim().toLowerCase();
const password = process.env.SEED_DEMO_PASSWORD || "DemoCmp2025!";

const passwordRecord = hashPassword(password);

const aboutMission =
  "Ejercer la función legislativa local y el control político del municipio Palavecino, creando y reformando ordenanzas de manera participativa junto a las comunidades. Su labor se rige por el compromiso de legislar con \"Honestidad, Eficiencia y Buen Servicio\", buscando dar respuestas normativas a las necesidades de servicios públicos, ordenamiento territorial y autonomía financiera de los ciudadanos.";

const aboutVision =
  "Ser el epicentro de la autonomía municipal que impulse la transformación y modernización de Palavecino frente a su acelerado crecimiento demográfico. Aspira a consolidar una ciudad funcional, segura y próspera mediante la sostenibilidad financiera, la resiliencia urbana, la modernización digital de su marco normativo y la protección rigurosa de su patrimonio histórico y ambiental, como el Parque Nacional Terepaima.";

/** Detalle en Markdown (sección «Nuestra historia e información» en el sitio público). */
const aboutBody = [
  "## Concejo Municipal Bolivariano de Palavecino",
  "",
  "## Información General",
  "El **Consejo Municipal de Palavecino** es el órgano deliberante y depositario de la potestad legislativa local del municipio Palavecino, estado Lara. Su sede principal se encuentra en el Edificio de los Poderes Públicos, ubicado en la calle Juan de Dios Ponte, frente a la Plaza Aquilino Juárez (o Plaza La Cruz), en el centro neurálgico de Cabudare.",
  "",
  "* **Lema Institucional:** \"¡Legislando con Honestidad, Eficiencia y Buen Servicio!\"",
  "",
  "## Composición y Directiva",
  "El cuerpo legislativo está conformado por un total de **nueve (9) concejales**. Históricamente ha reflejado las transiciones políticas del país, y para el período legislativo 2024, su composición cuenta con **siete (7) concejales pertenecientes a la bancada del PSUV - GPP y dos (2) de los partidos de oposición**.",
  "",
  "Para el período legislativo 2023, la Junta Directiva se instaló de la siguiente manera:",
  "* **Presidenta:** Edderick Roxana Escalona (educadora).",
  "* **Vicepresidente:** José Timaure.",
  "* **Secretaría:** Flor Ramírez (Secretaria) y Zubely Mendoza (Subsecretaria).",
  "",
  "## Funciones y Competencias Principales",
  "De acuerdo con la Ley Orgánica del Poder Público Municipal y las dinámicas locales, el Concejo Municipal tiene las siguientes responsabilidades primordiales:",
  "",
  "* **Creación de Ordenanzas:** Iniciar, consultar, discutir y sancionar proyectos de ordenanzas que regulan la vida local, abarcando desde la convivencia ciudadana y el ordenamiento urbano, hasta las actividades económicas y de hacienda pública.",
  "* **Control Político y Fiscal:** Ejercer funciones de control sobre el gobierno ejecutivo local (Alcaldía) y la administración pública municipal.",
  "* **Participación Ciudadana:** Garantizar y promover la inclusión del pueblo en las decisiones normativas mediante mecanismos como consultas públicas, mesas de trabajo y recepción de propuestas vecinales.",
  "* **Guardián de la Identidad:** Legislar para la preservación del patrimonio histórico y la promoción de los símbolos patrios locales, como la bandera, el escudo y elementos representativos como el Parque Nacional Terepaima o la histórica Ceiba de Cabudare.",
  "",
  "## Hitos Legislativos y Desafíos Recientes",
  "* **Modernización Tributaria:** Entre 2022 y 2024, el Concejo ha tenido una actividad legislativa intensa para adaptar sus ordenanzas a la normativa nacional (LOCAPTEM), modernizando los tributos y estableciendo la **Unidad de Cuenta Dinámica (UCD)** para proteger la recaudación de la volatilidad cambiaria.",
  "* **Gestión de Crisis y Servicios Públicos:** El Concejo enfrenta el reto monumental de la crisis hídrica que afecta a más de **124.000 habitantes** por la inoperatividad de pozos profundos, debatiendo la creación de fondos o alianzas para la infraestructura del agua, indispensable para que el municipio no paralice su crecimiento inmobiliario.",
  "",
].join("\n");

/** Seis noticias (Markdown enriquecido; imágenes vía Unsplash; solo seeder de demostración). */
const bodyCrisisHidrica = [
  "> **Aviso (demo / seeder):** las cifras y propuestas son **contenido ficticio** para maquetar el sitio; no sustituyen reportes técnicos ni comunicados oficiales de la alcaldía.",
  "",
  "En el **municipio Palavecino** la **crisis hídrica** se ha consolidado, según el relato reutilizado en esta nota, como un problema estructural grave. De unos **332.000 habitantes** estimados, se calcula que **más de 124.000** no tendrían acceso regular a **agua potable** (alrededor de un tercio de la población), con **desinversión** y falta de **mantenimiento** como factores de fondo.",
  "",
  "El abastecimiento descrito depende **por entero** de *aguas subterráneas*: la red cita **13 pozos profundos**, de los cuales **solo 7** estarían operativos a finales de **2023**; el resto, fuera de servicio por inversión insuficiente o paralización y fallas.",
  "",
  "![Gotas y vidrio (Unsplash) — referencia genérica, no toma de campo](https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=700&fit=crop&auto=format)",
  "*Pie: imagen de stock bajo [licencia Unsplash](https://unsplash.com/license).",
  "",
  "Para afrontar la **emergencia** se debate una inversión *cercana* a **un millón de dólares** destinada a: **5 nuevas perforaciones** en el acuífero de **Valle Hondo**; **rehabilitación electromecánica** de **6** unidades inactivas; y una meta *referencial* de aprox. **860 L/s** de producción, tal como se menciona en el cuerpo original. Las cifras reales requieren validación con **Gaceta** o documentos municipales oficiales.",
  "",
  "## Síntesis (tabla)",
  "",
  "| Tema | Dato (relato) | Nota |",
  "|------|---------------|------|",
  "| Población (aprox.) | 332.000 hab. | orden de magnitud |",
  "| Sin agua *regular* (aprox.) | 124.000+ | tercio de la población (texto) |",
  "| Pozos / en servicio (fin 2023) | 13 / 7 | red subterránea (texto) |",
  "| Meta de bombeo (debate) | 860 L/s | solo ilustración en seeder |",
  "",
  "## Hoja de ruta (tareas)",
  "",
  "- [x] Perforar **5** pozos adicionales en *Valle Hondo* (plan citado en la nota).",
  "- [x] Rehabilitar **6** motobombas o equipos **electromecánicos** inactivos.",
  "- [ ] Conciertos interinstitucionales y monitoreo sostenible de O&M (pendiente en toda inversión real).",
  "",
  "![Cauce húmedo (Unsplash) — no implica el río Turbio ni obras reales de Palavecino](https://images.unsplash.com/photo-1432405972618-c60b0235b8f0?w=1200&h=640&fit=crop&auto=format)",
  "",
  "## Medio ambiente y carga sobre el acuífero",
  "",
  "Además, el texto alude a la **deforestación** en el entorno del **Parque Nacional Terepaima** (pérdida del *10%* del manto verde comunal en el relato) y a la **contaminación** del río **Turbio** como agravantes que afectan la **infiltración** hacia el acuífero y, en el argumento, el desarrollo urbano de **Cabudare**.",
  "",
  "> *«Reducir la fuga hídrica y recuperar obras sin plan de cuenca deja a la comunidad a mitad de camino.»*  \n> — cita *ficticia* solo para probar comillas y tipografía; no atribuida a persona pública concreta.",
  "",
  "1. Mapear pérdidas técnicas y fuga en red.  ",
  "2. Articular obras con plan de **cuenca** y riesgo ambiental.  ",
  "3. Publicar cifras finales y cronograma solo luego de **Gaceta** o informe de la autoridad competente.  ",
  "",
  "---",
  "*Fin del artículo de demostración — noticia: crisis hídrica en Palavecino.*  ",
  "",
].join("\n");

const bodyModernizacionTributaria = [
  "> **Aviso (demo / seeder):** nombres de leyes, tasas y *UCD* se usan solo para probar el layout. Pida asesoría jurídica y hacendaria **antes** de replicar párrafos en gacetas o despachos reales.",
  "",
  "El **Concejo Municipal Bolivariano de Palavecino** relata, en el texto aportado, un ciclo de **modernización** del marco normativo **ante** la *Ley orgánica de coordinación y armonización de las potestades tributarias de estados y municipios* (a menudo citada como **LOCAPTEM**; comprobar nombre, sigla y expediente en publicación oficial).",
  "",
  "Como *resume* el cuerpo original: reformas a la **Ordenanza de actividades económicas** (industria, comercio y servicios) con **tasas administrativas** pagaderas por **buzones fiscales electrónicos**; y la **Ordenanza de publicidad y propaganda** que liga el tributo al *mantenimiento* y a la *limpieza* del *ornato*. La **UCD (Unidad de Cuenta Dinámica)** puede servir para **tasar** *pagos* anclados al tipo *BCV* o al criptoactivo **Petro (PTR)**, a modo de *criterio* *referencial*; los *montos* *reales* salen de la **Gaceta** o norma vigente.",
  "",
  "## Puntos aludidos (lista numerada y viñeta)",
  "",
  "1. *Reducir* carga y roces con **canales fiscales electrónicos** (relato de demostración).  ",
  "2. Sostener la **UCD** como pauta **anti-inflación** a nivel informativo (narrado).  ",
  "",
  "- Consultas o **audiencias** públicas para acompañar la reforma (citar *fechas* *reales* en producción).  ",
  "",
  "![Mesa con documentos (Unsplash)](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&h=650&fit=crop&auto=format)",
  "",
  "| Pilar | Contenido (resumen) | Marca (GFM) |",
  "|-------|---------------------|-------------|",
  "| Trazabilidad | buzón o registro *electrónico* | `[x]` (demo) |",
  "| Ancla monetaria | BCV, **UCD**, o **PTR** (texto) | `[x]` |",
  "| Legitimación | consulta o audiencia pública | `[ ]` a completar |",
  "",
  "```json",
  "{",
  '  "tema": "ordenes-ucd-palavecino",',
  '  "buzon_elect": true,',
  '  "ucd_mencion": true,',
  '  "es_seed_demo": true',
  "}",
  "```",
  "",
  "![Mesa de reunión (Unsplash) — no es la sede del Concejo](https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=600&fit=crop&auto=format)",
  "",
  "> *«Alinear leyes nacionales con la claridad hacia comercio y vía pública cuesta: aquí probamos cita, no norma.»*  \n> — cita *ficticia* para tipografía; no voz pública *real* atribuida.",
  "",
  "Al cerrar, el texto original *invitaba* a *consideraciones* *ciudadanas*; reemplace *este* cierre *con* *enlaces* a **Gaceta** y *calendario* oficiales.  \n*~~Borrador: ignorar al publicar en serio.~~*",
  "",
  "---",
  "*Fin del artículo de demostración — modernización tributaria (UCD, buzones, LOCAPTEM, ordenanzas).*  ",
  "",
].join("\n");

const bodyPlazaBolivar = [
  "> **Aviso (demo / seeder):** horarios, nombres propios y *autoridades* citadas solo ilustran el layout. Confirme toda *convocatoria* en *prensa* oficial y *Gaceta* antes de difundir.",
  "",
  "Por **primera vez** en el relato aportado para esta nota, los **actos centrales** conmemorativos de la **Batalla de Carabobo** y del *Día del Ejército Bolivariano* se celebrarían en la **renovada Plaza Bolívar de Cabudare**. El anuncio, según el texto, habría sido difundido por el alcalde **Derby Guedez** en *redes sociales*; la mención a persona pública *aquí* es *solo* para maquetar el boletín — verifíquela con la fuente *oficial* de la *alcaldía*.",
  "",
  "Un **cronograma informativo** fija la **apertura** a partir de las **10:00 a. m.**, con participación — según el cuerpo — del *gobernador del estado Lara* y del *alto mando militar* (citas *genéricas* en relleno; nombres definitivos fuera del seeder). Las fotos de **Unsplash** que siguen son *solo* ilustración, no tomas oficiales del *acto* o de la *plaza*.",
  "",
  "![Paisaje montañoso (Unsplash) — genérico, no es Cabudare](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=720&fit=crop&auto=format)",
  "",
  "#### Guion aproximado (tabla de *maqueta*)",
  "",
  "| Tramo (simulado) | Eje en el relato | Detalle mínimo |",
  "|------------------|------------------|---------------|",
  "| Apertura | 10:00 a. m. | himnos, bandas, desfile (ficción) |",
  "| Bloque cívico–militar | autoridades y alto mando | confirmar nombres en gaceta o boletín |",
  "",
  "![Amanecer en ciudad (Unsplash)](https://images.unsplash.com/photo-1565008576549-57569a49471a?w=1200&h=640&fit=crop&auto=format)",
  "",
  "## Patrimonio e identidad",
  "",
  "Cabudare *aparece* en el *relato* como *núcleo* *metropolitano*; el cuerpo original cita la **ceiba (jabillo)** bajo cuya sombra, en *tradición*, se habría albergado a **Simón Bolívar** (1813) — dato a contrastar *siempre* con *corpus* *histórico* serio; *aquí* solo *demuestra* **citas** y *tipografía* *del* *CMS*.",
  "",
  "- [x] Bloques: `H2`, tabla, listas, imágenes, `~~strikethrough~~` (prueba abajo).",
  "- [ ] Sustituir hora, orden del día y biografías por *datos* oficiales.",
  "",
  "> *«Elegir la Plaza Bolívar de Cabudare refuerza el sentido de pertenencia si el acto acompaña el cuidado del aforo y el patrimonio vivo.»*  \n> — cita *ficticia*; no atribuida a un cargo concreto.",
  "",
  "El *slug* en base de datos para esta nota: `actos-historicos-24-junio-plaza-bolivar-cabudare`.  \n*~~Párrafo de boceto duplicado, ignorar al publicar~~*",
  "",
  "---",
  "*Fin del artículo de demostración — 24 de junio / Plaza Bolívar, Cabudare (seed).*  ",
  "",
].join("\n");

const bodyAccidentesTransito = [
  "> **Aviso (demo / seeder):** cifras y hechos *forman* esta nota de *prueba*. La verificación fáctica pasa *por* actas y cobertura oficial; no *por* *este* *repositorio* *.*",
  "",
  "En el *fin* *de* *semana* *alrededor* *del* **26** *de* *abril* *de* *2026*, el relato aportado describe *en* *la* *vialidad* *de* **Palavecino** *dos* *accidentes* *vinculados* *a* *motocicletas* *y* *tres* **fallecidos** *en* *el* *total*; *en* *el* *segundo* *hecho* *una* **mujer** *resulta* **herida** (solo ficción de *laboratorio*; *;*  ",
  "",
  "## **Intercomunal** (Cabudare) *;*  ",
  "",
  "Un **motorizado** fallecía, *en* *el* *cuerpo* *original*, *al* *impactar* *con* *fuerza* *contra* *un* **camión** **estacionado** *en* *la* avenida **Intercomunal de Cabudare**; *;*  ",
  "",
  "![Carretera (Unsplash), no imagen *real* *.*](https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&h=650&fit=crop&auto=format)",
  "",
  "## *Carretera* *vieja* a **Yaritagua** *;*  ",
  "",
  "Otro *siniestro* *sería* *una* **colisión** *entre* *motocicletas* *en* *la* **carretera vieja** a **Yaritagua** (según el cuerpo aportado) *con* *dos* **fallecidos** *y* *una* **mujer herida**; *;*  ",
  "",
  "| Siniestro | Lugar aprox. | Resumen (texto del usuario) |",
  "|----------|-------------|-----------------------------|",
  "| 1 | **Intercomunal** (Cabudare) | 1 fallecido, *vs.* camión |",
  "| 2 | *Vieja* a **Yaritagua** (motos) | 2 fallecidos; 1 herida (mujer) |",
  "",
  "![Moto (Unsplash) — *stock* *;*  ](https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=1200&h=640&fit=crop&auto=format)",
  "",
  "Las *autoridades* *citaron*, *en* *el* *cuerpo* *original*, *un* *llamado* a la **precaución** y a **respeto** a las *leyes* *de* *tránsito* y a **no exceso de velocidad** con *énfasis* *en* *conductores* *en* *vehículos* *de* *dos* *ruedas* *;*  ",
  "",
  "- [x] Aviso, **##**, tabla, 2 *imágenes* *;*  ",
  "- [ ] Sustituir cifras por *boletín* *;*  ",
  "",
  "> *«En laboratorio solo afinamos márgenes; la cifra real cruza con familias y autoridad.»*  \n> — cita ficticia; no voz pública real.",
  "",
  "---",
  "*Fin (seed) — tránsito, Palavecino (demo).",
  "",
].join("\n");

const bodyCentroAndresEloyBlanco = [
  "> **Aviso (demo / seeder):** apertura, cupo y cursos *son* *ficción* *de* *laboratorio*; *confirma* toda apertura *en* *Gaceta* o *comunicado* *oficial* *.*",
  "",
  "Con *anuncio* *formal* *del* **21** *de* *abril* *de* *2026* *nace* *en* *Palavecino* *el* **Centro de Formación Artística «Andrés Eloy Blanco»** *como* *lugar* *para* *educar* *a* *jóvenes* *y* *adultos* y *proyectar* *expresiones* *artísticas* *;*  ",
  "",
  "![Instrumentos y piano (Unsplash)](https://images.unsplash.com/photo-1511192338275-6080d2d48e9d?w=1200&h=650&fit=crop&auto=format)",
  "",
  "## Patrimonio y cultura (relato) *;*  ",
  "",
  "El cuerpo original cita *el* **baile** *del* **Tamunangue** *y* *a* *cultores* y *artesanos* *como* *parte* *de* *la* *identidad* *palavecinense*; *;*  ",
  "",
  "El *nuevo* *centro* *debería* *ofrecer* *relevo* y *proyección* *en* *la* *escena* *larense*; *;*  ",
  "",
  "- *Formación* *transversal* y *diversa*; *;*  ",
  "- *Memoria* *viva* *a* *través* *de* *tradición*; *;*  ",
  "",
  "![Taller creativo (Unsplash)](https://images.unsplash.com/photo-1507838153414-4b713bddf843?w=1200&h=640&fit=crop&auto=format)",
  "",
  "| *Eje* *|* *Cita* *en* *cuerpo* *original* *;*  ",
  "|-----|----|  ",
  "| *Identidad* | *Tamunangue*, oficios, memoria; *;*  ",
  "| *Relevo* *|* *jóvenes* *larenses* *;*  |",
  "",
  "> *«*Un* *muro* *nuevo* *no* *basta* *: * *cruce* *currículo* *y* *cupo* *;*  ",
  "»*  \n> — cita *ficticia* *;*  ",
  "",
  "---",
  "*Fin* *(seed) —* *C* *F* *A* *Andrés* *Eloy* *Blanco*; *;*  ",
  "",
].join("\n");

const bodyOrdenanzaConvivencia = [
  "> **Aviso (demo / seeder):** cifra de sanciones y títulos de *ordenanzas* son *relleno*; consúltese **Gaceta** municipal y oficios reales *antes* de *invocar* *sanción* o *categoría* *jurídica* *.*",
  "",
  "En **2026**, *según* *el* *cuerpo* *aportado* *a* *este* *repositorio*, *la* *alcaldía* *y* *cuerpos* *asociados* *vienen* **intensificando** *operativos* *bajo* *la* **Ordenanza para la Convivencia Ciudadana, el Civismo y la Justicia de Paz Comunal** (nombre *largo* *a* *comprobar* *en* *cada* *versión* *vigente*; *a* *veces* *se* *corta* *en* *mención* *oral* *como* *«ordenanza* *de* *convivencia»* *). * *El* *objetivo* *mencionado* *en* *el* *mismo* *hilo* *: * **orden** *urbano* y **calidad** *de* *vida* *en* *parroquias* **Cabudare** y **José Gregorio Bastidas** (no *citar* *como* *censo* *hasta* *cruce* *con* *cédula* *catastral* y *Gaceta*; *ficción* *básica* *a* *efecto* *maqueta* *).*  ",
  "",
  "![Avenida urbana al anochecer (Unsplash) — *no* es un operativo *real* retransmitido *aquí*](https://images.unsplash.com/photo-1514565131-fce0801d5781?w=1200&h=700&fit=crop&auto=format)",
  "",
  "## *Qué* *cita* *el* *texto* *en* *materia* *de* *fiscalización* (relato) * *",
  "",
  "- *Contaminación* **sónica**: cita **31 sanciones** a *establecimientos* y *fiestas* *privadas* *en* *un* *solo* *operativo* *nocturno* *por* *rebasar* *límites* *acústicos* *y* *ventanas* *horarias*; *cifra* *a* *cruzar* *con* *Gaceta*; *;*  ",
  "- *Acera* y *plazas* *públicas*: *prohíbese* *parking* *irregular* *sobre* *veredas* *e* *indebido* *uso* *en* *plazas* *narrado*; *a* *maquetar* *criterio* *foto–denuncia*; *aún* *no* *carga* *link*; *cierre* *—* (seed).  ",
  "- *Aseo* y *vía* *: * *multa* *por* *tirar* *basura* *desde* *vehículo*; *campaña* *en* *contra* *de* *piruetas* *o* *acrobacias* *en* *motocicletas* *cita* *a* *Intercomunal* y *a* *seguridad* *vial*; *a* *cambiar* *a* *datos* *fiscales* *laborales*; *aún* *no* *Gaceta*; *aún* *puro* *Markdown* *;*  ",
  "",
  "![Bolsas y residuos (Unsplash) — metáfora aseo urbano, no expediente *real* *.*](https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&h=600&fit=crop&auto=format)",
  "",
  "| Frente (relato) | Cita en cuerpo original (seed) |",
  "|-----------------|--------------------------------|",
  "| Ruido *nocturno* | *31* *sanciones* (operativo) |",
  "| *Espacio* público *limpio* | *multa* y *cobertura* *boca* a *calle* |",
  "| *Motocicletas* | *acróbatas* o *piruetas* en *vía*; *cierre* a *Gaceta*; *aún* *boceto* |  ",
  "",
  "```",
  "ordenanza: convivencia (demo) — 2026",
  "cifra_31: solo_illustrativa",
  "```",
  "",
  "*Nota* *: *el *cierre* *del* *cuerpo* *original* *mencionaba* *cultura* *de* *corresponsabilidad*; *a* *cambio* *de* *Gaceta*; *a* *laborar*; *a* *probar*; *a* *no* *usar* *cómo* *cita* *a* *boleta*; *a* *fin* *bajo* *línea* *;*  ",
  "",
  "---",
  "*Fin (seed) — operativos / Ordenanza de convivencia / Palavecino (demo).",
  "",
].join("\n");

const newsRows = [
  {
    slug: "crisis-hidrica-palavecino-habitantes-sin-agua",
    title: "Crisis hídrica en Palavecino: Más de 124 mil habitantes sin acceso regular al agua potable",
    excerpt:
      "El municipio Palavecino enfrenta una severa crisis de agua potable. El Concejo Municipal evalúa una inversión millonaria para reactivar pozos y mitigar el impacto que afecta a un tercio de la población debido a la desinversión y daños ambientales.",
    body: bodyCrisisHidrica,
    published_at: "2026-04-12T10:00:00Z",
  },
  {
    slug: "modernizacion-tributaria-palavecino-unidad-cuenta-dinamica",
    title: "Concejo Municipal de Palavecino moderniza su sistema tributario con la Unidad de Cuenta Dinámica",
    excerpt:
      "Para adaptarse a la normativa nacional y garantizar la sostenibilidad financiera, el Concejo Municipal de Palavecino aprobó la reforma de ordenanzas sobre actividades económicas y publicidad, implementando el pago mediante buzones fiscales electrónicos.",
    body: bodyModernizacionTributaria,
    published_at: "2026-04-10T11:00:00Z",
  },
  {
    slug: "actos-historicos-24-junio-plaza-bolivar-cabudare",
    title: "Histórico: La renovada Plaza Bolívar de Cabudare será sede de los actos centrales del 24 de junio",
    excerpt:
      "Por primera vez en la historia del municipio, los actos protocolares conmemorativos de la Batalla de Carabobo se celebrarán en la Plaza Bolívar de Cabudare, un evento que resalta el rescate del patrimonio y la identidad palavecinense.",
    body: bodyPlazaBolivar,
    published_at: "2026-04-14T09:30:00Z",
  },
  {
    slug: "fin-semana-tragico-accidentes-motos-palavecino",
    title: "Fin de semana trágico en Palavecino: Accidentes de tránsito dejan saldo de tres motorizados fallecidos",
    excerpt:
      "Dos graves accidentes de tránsito que involucraron motocicletas enlutaron a Palavecino, dejando un lamentable saldo de tres fallecidos en la Intercomunal de Cabudare y en la carretera vieja a Yaritagua.",
    body: bodyAccidentesTransito,
    published_at: "2026-04-28T10:00:00Z",
  },
  {
    slug: "nace-centro-formacion-artistica-andres-eloy-blanco-palavecino",
    title: "Impulso a la cultura local: Nace el Centro de Formación Artística «Andrés Eloy Blanco» en Palavecino",
    excerpt:
      "El municipio Palavecino fortalece su agenda educativa y cultural con el reciente nacimiento del Centro de Formación Artística «Andrés Eloy Blanco», un nuevo espacio dedicado a nutrir y proyectar el talento de la región.",
    body: bodyCentroAndresEloyBlanco,
    published_at: "2026-04-22T12:00:00Z",
  },
  {
    slug: "operativos-ordenanza-convivencia-ciudadana-palavecino",
    title: "Alcaldía de Palavecino intensifica operativos bajo la nueva Ordenanza de Convivencia Ciudadana",
    excerpt:
      "Las autoridades locales aplican con rigor la Ordenanza de Convivencia Ciudadana en Palavecino, sancionando fuertemente la contaminación sónica, la gestión inadecuada de desechos y las infracciones en los espacios públicos.",
    body: bodyOrdenanzaConvivencia,
    published_at: "2026-04-20T15:00:00Z",
  },
];

const parts = [];

parts.push(
  `-- Población de demostración (ficticia). Borra: admin, noticias, consejo, gacetas, "about"; actualiza Instagram cache a vacío.
-- NO ejecutar sobre una base con datos reales que quieras conservar.
-- (Sin BEGIN/COMMIT: wrangler d1 execute --remote no admite transacciones SQL en archivo.)

DELETE FROM council_members;
DELETE FROM council_positions;
DELETE FROM gazettes;
DELETE FROM news;
DELETE FROM admin_users;
DELETE FROM site_content;

INSERT INTO site_content (key, body) VALUES
  ('about_mission', ${q(aboutMission)}),
  ('about_vision', ${q(aboutVision)}),
  ('about', ${q(aboutBody)});

INSERT INTO admin_users (email, password_record) VALUES (${q(email)}, ${q(passwordRecord)});
`
);

for (const n of newsRows) {
  parts.push(
    `INSERT INTO news (slug, title, excerpt, body, published, published_at) VALUES (${q(
      n.slug
    )}, ${q(n.title)}, ${q(n.excerpt)}, ${q(n.body)}, 1, ${q(n.published_at)});`
  );
}

/** 20 noticias mínimas para probar paginación; fechas antiguas para quedar al final del listado. */
const unsplashFiller =
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop&auto=format";
for (let i = 1; i <= 20; i++) {
  const slug = `noticia-relleno-${i}`;
  const title = `Noticia de relleno ${i}`;
  const excerpt = "";
  const body = `![Relleno](${unsplashFiller})\n`;
  const d = new Date(Date.UTC(2010, 0, 1 + i));
  const published_at = d.toISOString().replace(/\.\d{3}Z$/, "Z");
  parts.push(
    `INSERT INTO news (slug, title, excerpt, body, published, published_at) VALUES (${q(
      slug
    )}, ${q(title)}, ${q(excerpt)}, ${q(body)}, 1, ${q(published_at)});`
  );
}

parts.push(`
INSERT INTO council_positions (id, name, sort_order) VALUES
  (1, 'Presidencia', 0),
  (2, 'Vocalía ejecutiva', 1),
  (3, 'Comisión de gobierno (demo)', 2);

INSERT INTO council_members (position_id, full_name, bio, photo_key, email, phone, sort_order) VALUES
  (1, 'María Elena Ficticia', 'Biografía de ejemplo. Rol presidencia.', NULL, 'presidencia@demo.cmp', '+58 200-0000000', 0),
  (2, 'José Demo Sánchez', 'Vocalía: texto ficticio para maquetar.', NULL, 'vocal@demo.cmp', NULL, 0),
  (2, 'Ana Montes (demo)', 'Segunda vocal por orden de prueba.', NULL, NULL, NULL, 1),
  (3, 'Carlos R. Placeholder', 'Miembro de comisión, datos no reales.', NULL, NULL, NULL, 0);

INSERT INTO gazettes (title, issue_number, published_at, r2_key, file_name, file_size, mime) VALUES
  (
    'Gaceta Oficial — Enero 2025 (demo)',
    'GO-2025-01',
    '2025-01-15T00:00:00Z',
    'gacetas/demo/gaceta-enero-2025.pdf',
    'Gaceta-Enero-2025-demo.pdf',
    0,
    'application/pdf'
  ),
  (
    'Gaceta Oficial — Diciembre 2024 (demo)',
    'GO-2024-12',
    '2024-12-10T00:00:00Z',
    'gacetas/demo/gaceta-diciembre-2024.pdf',
    'Gaceta-Dic-2024-demo.pdf',
    0,
    'application/pdf'
  );
`
);

const fillerGaz = [];
for (let i = 1; i <= 20; i++) {
  const d = new Date(Date.UTC(2008, 0, 1 + i * 3));
  const published_at = d.toISOString().replace(/\.\d{3}Z$/, "Z");
  fillerGaz.push(
    `  (${q(`Gaceta de relleno ${i} (prueba)`)}, ${q(`GO-FILL-${String(i).padStart(3, "0")}`)}, ${q(
      published_at
    )}, 'gacetas/demo/gaceta-enero-2025.pdf', ${q(`Gaceta-relleno-${i}-demo.pdf`)}, 0, 'application/pdf')`
  );
}
parts.push(
  `INSERT INTO gazettes (title, issue_number, published_at, r2_key, file_name, file_size, mime) VALUES
${fillerGaz.join(",\n")};
`
);

parts.push(`


UPDATE instagram_cache SET payload = '[]', error = NULL, fetched_at = datetime('now') WHERE id = 1;
`);

const sql = parts.join("\n");

console.log("══════════════════════════════════════════════════════════════");
console.log("  Datos de acceso (panel /gestion-cmp/login) — demostración");
console.log("  Correo:   ", email);
console.log("  Contraseña:", password);
console.log("══════════════════════════════════════════════════════════════");
console.log("");

if (writeFile) {
  const out = "seed-demo.sql";
  writeFileSync(out, sql + "\n", "utf8");
  console.log(`Escrito: ${out}`);
  console.log("");
  console.log("Aplicar:");
  console.log("  npx wrangler d1 execute cmp-db --local  --file=seed-demo.sql");
  console.log("  npx wrangler d1 execute cmp-db --remote --file=seed-demo.sql");
} else {
  console.log("SQL generado (usa --write para guardar en seed-demo.sql):");
  console.log("");
  console.log(sql);
}
