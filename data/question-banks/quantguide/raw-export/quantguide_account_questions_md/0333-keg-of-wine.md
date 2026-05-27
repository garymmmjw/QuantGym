# QuantGuide Question

## 333. Keg of Wine

**Metadata**

- ID: `WfUxsorpFpYlsB37ueIw`
- URL: https://www.quantguide.io/questions/keg-of-wine
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Belvedere Trading, Optiver
- Source: http://jnsilva.ludicum.org/HMR13_14/536.pdf number 406
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-4 20:06:49 America/New_York
- Last Edited By: Gabe

### 题干

Alex has a 10-gallon keg of wine and a big ladle. On Monday, Alex drew off a ladle-full of wine and filled the keg back up with water. On Tuesday, he repeated the process, making sure to mix the contents in the keg around first. On Wednesday morning, he realized that the keg now contains equal parts of wine and water. How many gallons can the ladle hold? The answer is in the form $a - b\sqrt{c}$ with $a = bc$. Find $a + b + c$.

### Hint

Let $x$ denote the capacity of the jug. Then, the proportion of wine in the keg after Tuesday can be denoted as:
\[
\begin{aligned}
    \frac{10 - x - \left(\frac{10 - x}{10}\right)x}{10}
\end{aligned}
\]

### 解答

Let $x$ denote the capacity of the jug. Then, the proportion of wine in the keg after Tuesday can be denoted as:
\[
\begin{aligned}
    \frac{10 - x - \left(\frac{10 - x}{10}\right)x}{10} &= \frac{1}{2} \\
    20 - 2x - \frac{10x - x^2}{5} &= 10 \\
    \Rightarrow x &= 10 - 5 \sqrt{2} 
\end{aligned}
\]

This means that $a + b + c = 17$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "WfUxsorpFpYlsB37ueIw",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 20:06:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2561802,
    "source": "http://jnsilva.ludicum.org/HMR13_14/536.pdf number 406",
    "status": "published",
    "tags": [],
    "title": "Keg of Wine",
    "topic": "brainteasers",
    "urlEnding": "keg-of-wine",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "WfUxsorpFpYlsB37ueIw",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Keg of Wine",
    "topic": "brainteasers",
    "urlEnding": "keg-of-wine"
  }
}
```
