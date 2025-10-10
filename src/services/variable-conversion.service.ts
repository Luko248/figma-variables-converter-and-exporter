/**
 * Variable conversion orchestration service
 */

import "../types/figma.types";
import { ConversionResult, ProcessedVariable, VariablesByTheme, CSSVariable } from "../types/index";
import { generateCSSValue } from "./css-value-generator.service";
import { generateCSSVariableName } from "./variable-naming.service";
import { detectVariableType } from "./variable-type-detector.service";
import {
  getCachedCSSVariableName,
  getPooledVariableObject,
  clearAllCaches,
} from "../helpers/cache.helper";
import {
  VARIABLE_BATCH_SIZE,
  SYNTAX_BATCH_SIZE,
} from "../constants/conversion.constants";

/**
 * Processes a batch of variables asynchronously
 */
async function processBatchOfVariables(
  variableIds: string[],
  collection: VariableCollection,
  allModes: Record<string, string>,
  variablesByTheme: VariablesByTheme
): Promise<void> {
  const promises = variableIds.map(async (variableId) => {
    try {
      const variable: Variable = await figma.variables.getVariableByIdAsync(
        variableId
      );

      if (!variable) {
        console.warn(`⚠️ Variable with ID ${variableId} not found`);
        return;
      }

      const cssVariableName = getCachedCSSVariableName(
        collection.name,
        variable.name,
        generateCSSVariableName
      );

      // Process variable for each theme/mode
      const variableModes = Object.keys(variable.valuesByMode || {});

      for (const modeId of variableModes) {
        const modeName = allModes[modeId] || "default";
        const cssValue = await generateCSSValue(variable, modeId, collection.name);

        if (cssValue) {
          if (!variablesByTheme[modeName]) {
            variablesByTheme[modeName] = [];
          }

          // Use object pooling to reduce garbage collection
          const variableObj = getPooledVariableObject();
          variableObj.name = cssVariableName;
          variableObj.value = cssValue;
          variableObj.type = detectVariableType(variable.name);
          variableObj.variable = variable;

          variablesByTheme[modeName].push(variableObj);

          console.log(`✅ [${modeName}] ${cssVariableName}: ${cssValue}`);
        } else {
          console.warn(
            `⚠️ Could not generate CSS value for ${variable.name} in mode ${modeName}`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error processing variable ${variableId}:`, error);
    }
  });

  await Promise.all(promises);
}

/**
 * Updates Figma syntax in batches
 */
async function updateFigmaSyntax(variables: ProcessedVariable[]): Promise<void> {
  let syntaxUpdateCount = 0;

  console.log(`🔧 Updating Figma syntax for ${variables.length} variables...`);

  for (let i = 0; i < variables.length; i += SYNTAX_BATCH_SIZE) {
    const batch = variables.slice(i, i + SYNTAX_BATCH_SIZE);

    for (const cssVar of batch) {
      try {
        if (cssVar.variable) {
          cssVar.variable.setVariableCodeSyntax("WEB", `var(${cssVar.name})`);
          syntaxUpdateCount++;
        }
      } catch (syntaxError) {
        console.warn(
          `⚠️ Failed to set syntax for ${cssVar.name}:`,
          syntaxError
        );
      }
    }

    // Yield control after each batch
    await new Promise<void>((resolve) => resolve());
  }

  console.log(
    `✅ Updated Figma web syntax for ${syntaxUpdateCount}/${variables.length} variables`
  );
}

/**
 * Converts Figma variables to CSS format
 */
export async function convertVariablesToCSS(): Promise<ConversionResult> {
  try {
    // Check if variables API is available
    if (!figma.variables || !figma.variables.getLocalVariableCollectionsAsync) {
      throw new Error(
        "Variables API not available. Please update Figma or check plugin permissions."
      );
    }

    const collections: VariableCollection[] =
      await figma.variables.getLocalVariableCollectionsAsync();

    if (collections.length === 0) {
      throw new Error(
        "No variable collections found! Create some variables first."
      );
    }

    console.log(`📊 Found ${collections.length} variable collection(s)`);

    const variablesByTheme: VariablesByTheme = {};

    // Collect all modes to detect themes
    const allModes: Record<string, string> = {};

    for (const collection of collections) {
      if (collection.modes && Array.isArray(collection.modes)) {
        collection.modes.forEach((mode: { modeId: string; name: string }) => {
          allModes[mode.modeId] = mode.name;
        });
      } else {
        // Fallback: extract from first variable
        if (collection.variableIds.length > 0) {
          const firstVariable = await figma.variables.getVariableByIdAsync(
            collection.variableIds[0]
          );
          if (firstVariable && firstVariable.valuesByMode) {
            Object.keys(firstVariable.valuesByMode).forEach((modeId, index) => {
              allModes[modeId] = `Mode ${index + 1}`;
            });
          }
        }
      }
    }

    console.log(`🎨 Found themes:`, Object.values(allModes));

    // Calculate total for progress tracking
    let totalProcessed = 0;
    let totalVariables = 0;

    for (const collection of collections) {
      totalVariables += collection.variableIds.length;
    }

    console.log(
      `🔄 Processing ${totalVariables} variables in batches of ${VARIABLE_BATCH_SIZE}...`
    );

    for (const collection of collections) {
      console.log(`🔍 Processing collection: ${collection.name}`);

      // Process variables in chunks
      const variableIds = collection.variableIds;
      for (let i = 0; i < variableIds.length; i += VARIABLE_BATCH_SIZE) {
        const batch = variableIds.slice(i, i + VARIABLE_BATCH_SIZE);

        await processBatchOfVariables(
          batch,
          collection,
          allModes,
          variablesByTheme
        );

        totalProcessed += batch.length;
        const progress = Math.round((totalProcessed / totalVariables) * 100);
        console.log(
          `⏳ Progress: ${progress}% (${totalProcessed}/${totalVariables})`
        );

        // Yield control to prevent UI blocking
        await new Promise<void>((resolve) => resolve());
      }
    }

    const totalVariableCount = Object.values(variablesByTheme).reduce(
      (sum, vars) => sum + vars.length,
      0
    );
    if (totalVariableCount === 0) {
      throw new Error("No valid CSS variables could be generated!");
    }

    console.log(
      `📝 Generated ${totalVariableCount} CSS variables across ${
        Object.keys(variablesByTheme).length
      } themes`
    );

    // Update Figma web devmode syntax
    const firstTheme = Object.values(variablesByTheme)[0] || [];
    await updateFigmaSyntax(firstTheme);

    // Set syntax highlighting in Figma
    figma.codegen.preferences.language = "CSS";

    console.log(
      `✅ Successfully converted variables for ${
        Object.keys(variablesByTheme).length
      } themes`
    );

    // Perform memory cleanup
    clearAllCaches();

    // Return variables organized by theme
    const allVariables: CSSVariable[] = [];
    Object.values(variablesByTheme).forEach((themeVars) => {
      themeVars.forEach((v) => {
        allVariables.push({
          name: v.name,
          value: v.value,
          type: v.type,
        });
      });
    });

    const themeData: Record<string, CSSVariable[]> = {};
    Object.entries(variablesByTheme).forEach(([theme, vars]) => {
      themeData[theme] = vars.map((v) => ({
        name: v.name,
        value: v.value,
        type: v.type,
      }));
    });

    return {
      variables: allVariables,
      count: totalVariableCount,
      themes: Object.keys(variablesByTheme),
      variablesByTheme: themeData,
    };
  } catch (error) {
    console.error("Error in conversion:", error);
    clearAllCaches();
    throw error;
  }
}
