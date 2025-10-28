using System;
using System.Collections.Generic;
using System.Linq;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;
using UnityEngine;


[BepInPlugin("com.brickoyster.whatdidipickup", "WhatDidIPickUp", "1.0.0")]

public class WhatDidIPickUp : BaseUnityPlugin
{
    private ConfigEntry<KeyCode> _toggleKey;

    internal static ManualLogSource logger;
    internal static bool printFetch;

    // Example: List to save various dictionaries
    internal static Dictionary<string, bool> saveState;

    private List<EnemyJournalRecord> _allEnemies = new List<EnemyJournalRecord>();

    private void Awake()
    {
        logger = Logger;
        printFetch = true;
        saveState = new Dictionary<string, bool>();

        Harmony.CreateAndPatchAll(typeof(WhatDidIPickUp), null);
        logger.LogInfo("Plugin loaded and initialized.");
        _toggleKey = base.Config.Bind("General", "ToggleKey", KeyCode.BackQuote, "Key to dump enemies.");
    }

    private void GetAllEnemies()
    {
        _allEnemies = EnemyJournalManager.GetAllEnemies();

        foreach (EnemyJournalRecord allEnemy in _allEnemies)
        {
            int kills = allEnemy.KillsRequired;
            string onlysteel = "";
            if ( allEnemy.name.Equals("Abyss Mass") )
            {
                onlysteel = "\n  \"mode\": \"steel\",";
            }
            logger.LogInfo($"" +
                $"\n{{" +
                $"\n  \"act\": 1," +
                $"\n  \"description\": \"{allEnemy.Description.ToString().Replace("’", "\'")}\"," +
                $"\n  \"flag\": \"{allEnemy.name}\"," +
                $"\n  \"hornetDescription\": \"{allEnemy.Notes.ToString().Replace("’", "\'")}\"," +
                $"\n  \"icon\": \"journal/{allEnemy.DisplayName.ToString().Replace(" ", "_")}.png\"," +
                $"\n  \"id\": \"{allEnemy.DisplayName.ToString().ToLower().Replace(" ","-")}\"," +
                $"\n  \"label\": \"{allEnemy.DisplayName}\"," +
                $"\n  \"link\": \"https://hollowknight.wiki/w/{allEnemy.DisplayName.ToString().Replace(" ","_")}\"," +
                $"{onlysteel}" +
                $"\n  \"required\": {allEnemy.KillsRequired}," +
                $"\n  \"type\": \"journal\"" +
                $"\n}},");
        }
    }

    private void Update()
    {
        if (Input.GetKeyDown(_toggleKey.Value)) { GetAllEnemies(); }
    }

    private static void saveSaveState(ref PersistentItemData<bool> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (saveState.ContainsKey(key))
        {
            saveState[key] = newItemData.Value;
        }
        else
        {
            saveState.Add(key, newItemData.Value);
        }
    }

    // Track states
    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentBoolItem), "TryGetValue")]
    private static void PostTryGetValue(PersistentBoolItem __instance, ref PersistentItemData<bool> newItemData)
    {
        if (printFetch) { logger.LogInfo("Fetching"); printFetch = false; }
        saveSaveState(ref newItemData);
    }

    // Print chanfged states
    [HarmonyPostfix]
    [HarmonyPatch(typeof(PersistentBoolItem), "SaveValue")]
    private static void PostSaveValue(PersistentBoolItem __instance, PersistentItemData<bool> newItemData)
    {
        var key = newItemData.SceneName + "_" + newItemData.ID;
        if (saveState.ContainsKey(key) && saveState[key] == newItemData.Value) { return; }
        logger.LogInfo("\nState changed for " + key);
        saveSaveState(ref newItemData);
    }

    // Print quest info
    [HarmonyPostfix]
    [HarmonyPatch(typeof(QuestManager), "ShowQuestAccepted")]
    private static void PostShowQuestAccepted(QuestManager __instance, FullQuestBase quest, object afterPrompt)
    {
        logger.LogInfo("\nQuest accepted: " + quest.DisplayName + "(" + quest.name + ").");
    }

    // Print player data changes
    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetBool")]
    private static void PostSetBool(PlayerData __instance, string boolName, bool value)
    {
        if (boolName == "hasKilled") { return; }
        if (boolName == "disablePause") { return; }
        if (boolName == "disableInventory") { return; }
        if (boolName == "atBench") { return; }
        logger.LogInfo($"\nPlayerData.SetBool called: {boolName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetInt")]
    private static void PostSetInt(PlayerData __instance, string intName, int value)
    {
        if (intName == "previousDarkness") { return; }
        if (intName == "currentInvPane") { return; }
        logger.LogInfo($"\nPlayerData.SetInt called: {intName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetFloat")]
    private static void PostSetFloat(PlayerData __instance, string floatName, float value)
    {
        logger.LogInfo($"\nPlayerData.SetFloat called: {floatName} = {value}");
    }

    [HarmonyPostfix]
    [HarmonyPatch(typeof(PlayerData), "SetString")]
    private static void PostSetString(PlayerData __instance, string stringName, string value)
    {
        logger.LogInfo($"\nPlayerData.SetFloat called: {stringName} = {value}");
    }
}