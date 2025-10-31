# Lidar-Defect-Viewer-
An FYP web platform for interactive 3D defect reporting, built by processing LiDAR (IFC) scan data and rendering it with three.js.

# Interactive Web-Based System for 3D Defect Reporting Using LIDAR Scans

[cite_start]This is the Final Year Project of Mohamad Imran Bin Mansor (301844), supervised by Dr. Muhammad Syafiq Bin Mohd Pozi[cite: 4].

## 1. Problem Statement

[cite_start]In Malaysia, managing building defects during the 24-month defect liability period (DLP) mandated by the Housing Development Act (HDA) is often a manual and inefficient process[cite: 10, 11].

[cite_start]Modern tools like Metaroom can capture 3D LiDAR scans and "Snapshot" images of defects[cite: 13]. [cite_start]However, a significant gap exists: this captured data (like `.ifc` files) often severs the link between the defect image and its precise 3D coordinate, requiring specialized software or manual cross-referencing to review[cite: 14, 15, 39].

## 2. Project Objectives

[cite_start]This project aims to build an automated pipeline and web dashboard to solve this problem[cite: 41].

1.  [cite_start]**To store** reported defect data, including descriptions and precise 3D coordinates, in a structured database (Firebase)[cite: 49, 63].
2.  [cite_start]**To implement** a Python module to automatically process `.ifc` scan files, extracting both the 3D model and the defect "Snapshot" information[cite: 50, 56].
3.  [cite_start]**To build** an intuitive web dashboard (using `three.js`) that displays the 3D model overlaid with interactive visual markers at each defect's location[cite: 51, 55].

## 3. Tech Stack

* **Backend/Processing:** Python (`ifcopenshell`)
* [cite_start]**Database:** Google Firebase (Firestore & Storage) [cite: 56]
* **Frontend:** HTML, CSS, JavaScript
* [cite_start]**3D Rendering:** `three.js` [cite: 55]
