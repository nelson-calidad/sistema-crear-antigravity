# CREAR — Manual de Flujogramas y Arquitectura Funcional

**Institución:** CREAR — Espacio Terapéutico Interdisciplinario  
**Versión:** 2.0 (Arquitectura Funcional y Operativa Descentralizada)  
**Fecha:** Octubre 2026  

---

## 1. Principio Rector de Arquitectura

> [!IMPORTANT]
> **AGENDA NO ES EL CENTRO DE LA ADMINISTRACIÓN DE CREAR.**
> Los nueve módulos administrativos tienen responsabilidades propias e igual jerarquía funcional. El módulo **Inicio** actúa como monitor ejecutivo y tablero de supervisión, pero no reemplaza ni gobierna los procesos de las demás áreas. La infraestructura compartida de almacenamiento y validación de permisos es **Google Sheets + Apps Script**.

```
NIVEL 1: Acceso institucional único y derivación automática de perfil
NIVEL 2: 9 Módulos administrativos de igual jerarquía + Portal de terapeutas
NIVEL 3: Infraestructura técnica compartida (Google Sheets + Apps Script)
```

---

## 2. Flujograma 1: CREAR — Organización general del sistema

### Diagrama Mermaid (Editable)

```mermaid
flowchart TD
    %% NIVEL 1: ACCESO
    URL["Enlace Único Institucional<br/>sistema-crear-antigravity"] --> AUTH["Inicio de Sesión con Google<br/>o Clave de Contingencia"]
    AUTH --> BACKEND["Google Apps Script API<br/>Validación en crear_users"]
    
    %% ROL SELECTION
    BACKEND -->|Rol Administradora| ADMIN_DASH["Panel Administrativo CREAR<br/>Dashboard Completo de 9 Módulos"]
    BACKEND -->|Rol Profesional| PORTAL["Portal de Terapeutas<br/>Vista Adaptable a Móvil"]

    %% RAMA TERAPEUTAS
    subgraph PORTAL_BOX ["Portal de Terapeutas (Uso Diario)"]
        PORTAL --> P1["Mi Agenda (Semanal/Diaria)"]
        PORTAL --> P2["Nueva Reserva de Consultorio"]
        PORTAL --> P3["Mis Reservas (Editar/Cancelar)"]
        PORTAL --> P4["Mi Disponibilidad Habitual"]
        PORTAL --> P5["Mis Pacientes (Fichas Propias)"]
    end

    %% RAMA ADMIN (9 MÓDULOS DE IGUAL JERARQUÍA)
    subgraph ADMIN_BOX ["9 Módulos Administrativos (Misma Jerarquía)"]
        direction TB
        M1["1. Inicio (Supervisión y Métricas)"]
        M2["2. Consultas y Admisiones"]
        M3["3. Agenda General"]
        M4["4. Consultorios (C1, C2, C3)"]
        M5["5. Profesionales"]
        M6["6. Finanzas y Cobros"]
        M7["7. Responsabilidades"]
        M8["8. Guardias CREAR"]
        M9["9. Configuración y Auditoría"]
    end
    ADMIN_DASH --> ADMIN_BOX

    %% NIVEL 3: PERSISTENCIA COMPARTIDA
    subgraph SHEETS_BOX ["Google Sheets + Apps Script (Infraestructura Técnica)"]
        S_APP["crear_appointments"]
        S_ROOMS["crear_rooms"]
        S_AGREE["crear_agreements"]
        S_MONEY["crear_money"]
        S_PROFILES["crear_profiles"]
        S_USERS["crear_users"]
    end

    PORTAL_BOX -->|Lectura de Ocupación y Escritura de Turnos Propios| SHEETS_BOX
    ADMIN_BOX -->|Control Institucional Completo y Permisos Totales| SHEETS_BOX
```

---

## 3. Flujograma 2: CREAR — Cómo registrar y gestionar turnos

### Diagrama Mermaid (Editable)

```mermaid
flowchart TD
    LOGIN["Ingreso al Enlace Único"] --> AUTH["Autenticación con Google"]
    AUTH --> OPEN_PORTAL["Apertura del Portal de Terapeutas"]
    OPEN_PORTAL --> CONSULTA["Consulta de Agenda y Ocupación de Consultorios"]

    CONSULTA --> ACCION_A["A. Reservar Consultorio"]
    CONSULTA --> ACCION_B["B. Registrar Turno de Paciente"]
    CONSULTA --> ACCION_C["C. Gestionar mis Reservas"]
    CONSULTA --> ACCION_D["D. Declarar Disponibilidad"]

    %% ACCION A
    ACCION_A --> SEL_ROOM["Elegir Consultorio (C1, C2 o C3)"]
    SEL_ROOM --> SEL_TIME["Definir Fecha y Franja Horaria"]
    SEL_TIME --> VAL_A["Validación de Disponibilidad Física"]
    VAL_A --> CONFIRM_BLOCK["Bloqueo de Consultorio Confirmado<br/>(Espacio Asegurado para la Profesional)"]

    %% ACCION B
    ACCION_B --> SEL_PAC["Seleccionar Paciente de su Padrón"]
    SEL_PAC --> SEL_SERV["Elegir Prestación Profesional"]
    SEL_SERV --> SEL_SLOT["Asignar Consultorio, Fecha y Hora"]
    SEL_SLOT --> CONFIRM_TURNO["Turno Clínico Registrado en Ficha"]

    %% ACCION C
    ACCION_C --> MOD_CAN["Opciones: Reagendar o Cancelar"]
    MOD_CAN -->|Si cancela| LIBERA["Consultorio Vuelve a Figurarse Libre en Tiempo Real"]

    %% ACCION D
    ACCION_D --> PREF["Indicar Franjas Habituales en Ficha"]
    PREF --> NOTA_DISP["Aclaración: No Constituye Reserva Física"]

    %% SINCRONIZACION
    CONFIRM_BLOCK --> SYNC["Sincronización Inmediata en Google Sheets"]
    CONFIRM_TURNO --> SYNC
    LIBERA --> SYNC

    SYNC --> AG_GEN["Agenda General Institucional"]
    SYNC --> ROOM_OCC["Ocupación Semanal en Consultorios"]
    SYNC --> PRO_PROF["Ficha en Profesionales"]

    subgraph PRIVACIDAD ["Regla de Privacidad Estricta"]
        PRIV["Cada terapeuta ve los datos de sus propios pacientes.<br/>Respecto a las demás profesionales, solo ve el consultorio como 'Ocupado'."]
    end
    SYNC --- PRIVACIDAD
```

---

## 4. Flujograma 3: CREAR — Gestión administrativa institucional

### Diagrama Mermaid (Editable)

```mermaid
flowchart TD
    ADMIN_LOGIN["Ingreso Responsable (Rol Admin)"] --> DASH["Dashboard Original CREAR"]
    
    subgraph NUEVE_MODULOS ["Nueve Módulos de Igual Jerarquía"]
        M_HOME["Inicio"]
        M_ADM["Consultas y Admisiones"]
        M_AGENDA["Agenda General"]
        M_ROOMS["Consultorios"]
        M_PROFS["Profesionales"]
        M_FIN["Finanzas"]
        M_RESP["Responsabilidades"]
        M_COV["Guardias CREAR"]
        M_SET["Configuración"]
    end
    DASH --> NUEVE_MODULOS

    %% CIRCUITO 1: CONSULTA Y ADMISIÓN
    subgraph C1 ["Circuito 1: Consulta y Admisión de Familias"]
        M_ADM -->|Recepción de Familia| ADM_REG["Registro de Derivación"]
        ADM_REG --> ADM_ENT["Coordinación de Entrevista Inicial"]
        ADM_ENT -->|Si es presencial| M_AGENDA
        ADM_ENT -->|Asignación Clínica| M_PROFS
    end

    %% CIRCUITO 2: ALTA DE PROFESIONAL
    subgraph C2 ["Circuito 2: Alta y Configuración de Profesional"]
        M_PROFS -->|Alta de Ficha| PRO_DATOS["Datos, Matrícula y Prestaciones"]
        PRO_DATOS --> PRO_USER["Habilitación de Acceso al Portal"]
        PRO_USER -->|Acuerdo Mensual de Uso| M_ROOMS
        M_ROOMS -->|Bloques Habilitados| M_AGENDA
    end

    %% CIRCUITO 3: TAREAS INTERNAS
    subgraph C3 ["Circuito 3: Organización Interna de Socias"]
        M_RESP --> RESP_TASK["Asignación y Seguimiento de Tareas"]
        RESP_TASK --> RESP_NOTE["Proceso 100% Autónomo (Sin consultorios)"]
    end

    %% CIRCUITO 4: GUARDIAS
    subgraph C4 ["Circuito 4: Guardias Institucionales"]
        M_COV --> COV_PLAN["Cronograma Semanal de Coberturas"]
        COV_PLAN -.->|Solo si requiere sala presencial| M_AGENDA
    end

    %% SUPERVISION EN INICIO
    M_ROOMS -.->|Ocupación física| M_HOME
    M_FIN -.->|Vencimientos y cobros| M_HOME
    M_ADM -.->|Admisiones pendientes| M_HOME
    M_COV -.->|Guardias del día| M_HOME
```

---

## 5. Flujograma 4: CREAR — Gestión de espacios y economía

### Diagrama Mermaid (Editable)

```mermaid
flowchart TD
    subgraph HABITUALES ["Modalidad 1: Profesionales Habituales"]
        PRO_FICHA["Ficha en Profesionales"] --> AGREE["Acuerdo Mensual Fijo en Consultorios"]
        AGREE --> CANON["Canon Mensual Fijo Pactado (ej. $65.000/mes)"]
        CANON --> REGLA_1["REGLA: El canon NO depende de cuántos pacientes<br/>atienda ni de los turnos clínicos cargados."]
        AGREE --> OCC_HAB["Bloqueo del Consultorio en Agenda y Ocupación"]
    end

    subgraph SUBALQUILERES ["Modalidad 2: Subalquileres a Terceros"]
        RENTAL_REG["Nuevo Alquiler en Consultorios"] --> RENTAL_COND["Pactado por Hora, Bloque o Período Ocasional"]
        RENTAL_COND --> VAL_FREE["Validar Disponibilidad del Espacio"]
        VAL_FREE --> OCC_RENT["Bloqueo Físico Inmediato del Consultorio"]
    end

    subgraph FINANZAS_MOD ["Módulo Finanzas: Gestión Centralizada de Fondos"]
        direction TB
        F1["1. Importe Acordado<br/>(Valor total pactado según acuerdo o alquiler)"]
        F2["2. Importe Pendiente<br/>(Saldo adeudado a la espera de cobro)"]
        F3["3. Efectivamente Cobrado<br/>(Pago asentado con fecha y medio)"]
        
        F1 --> F2 --> F3
    end

    CANON -->|Genera Ingreso Mensual Esperado| FINANZAS_MOD
    RENTAL_COND -->|Genera Obligación de Pago| FINANZAS_MOD

    subgraph REGLAS_ORO ["Reglas Institucionales de Coherencia"]
        R_COBRO["Los cobros se registran ÚNICAMENTE en Finanzas.<br/>Ni Consultorios ni Agenda cobran dinero."]
        R_OCC["La ocupación física es prioritaria:<br/>El espacio queda reservado aunque el pago esté pendiente."]
        R_TURNO["Los turnos individuales no son cobros para CREAR:<br/>Cada terapeuta cobra sus honorarios de forma independiente."]
    end

    FINANZAS_MOD --- REGLAS_ORO
    OCC_HAB --- REGLAS_ORO
    OCC_RENT --- REGLAS_ORO
```

---

## 6. Archivos Generados en el Proyecto

Los flujogramas se encuentran listos para visualizar e imprimir en la carpeta `docs/flujogramas/`:

1. [flujograma_1_organizacion_general.html](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_1_organizacion_general.html) / [PDF individual](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_1_organizacion_general.pdf)
2. [flujograma_2_circuito_terapeutas.html](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_2_circuito_terapeutas.html) / [PDF individual](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_2_circuito_terapeutas.pdf)
3. [flujograma_3_circuito_administrativo.html](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_3_circuito_administrativo.html) / [PDF individual](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_3_circuito_administrativo.pdf)
4. [flujograma_4_espacios_y_finanzas.html](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_4_espacios_y_finanzas.html) / [PDF individual](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujograma_4_espacios_y_finanzas.pdf)
5. **Documento Maestro Completo (4 diagramas reunidos):**  
   - [flujogramas_crear_completo.html](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/flujogramas_crear_completo.html)  
   - [CREAR_Flujogramas_Arquitectura_Funcional.pdf](file:///c:/Users/usuario/Desktop/Autosol%20Jujuy/Nelson/CREAR%20-%20Antigravity/docs/flujogramas/CREAR_Flujogramas_Arquitectura_Funcional.pdf)

