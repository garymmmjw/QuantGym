# QuantGuide Question

## 1136. Repetitious Game II

**Metadata**

- ID: `QLnB4vdM9Izyx8I7I2s8`
- URL: https://www.quantguide.io/questions/repetitious-game-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Citadel
- Source: Original
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:24:19 America/New_York
- Last Edited By: Gabe

### 题干

Audrey repeatedly draws cards from a standard 52-card deck with replacement. Compute the expected number of draws for Audrey to get at least one card from each suit. 

### Hint

Let $X_1$ denote the number of draws it takes for Audrey to draw a card from a unique suit. Let $X_2$ denote the number of draws it takes for Audrey to draw a card from a second unique suit after a card from the first unique suit has been draw. We'll define $X_3$ and $X_4$ in a similar way for the third and fourth unique suit draws, respectively. Then, the number of total draws it takes for Audrey to get at least one card from each suit is $Z = X_1 + X_2 + X_3 + X_4 $. 

### 解答

Let $X_1$ denote the number of draws it takes for Audrey to draw a card from a unique suit. Let $X_2$ denote the number of draws it takes for Audrey to draw a card from a second unique suit after a card from the first unique suit has been draw. We'll define $X_3$ and $X_4$ in a similar way for the third and fourth unique suit draws, respectively. Then, the number of total draws it takes for Audrey to get at least one card from each suit is $Z = X_1 + X_2 + X_3 + X_4 $. By the Linearity of Expectation, 
\[\begin{aligned}
    \mathbb{E}[Z] &=  \mathbb{E}[X_1 + X_2 + X_3 + X_4] \\
    &= \mathbb{E}[X_1] + \mathbb{E}[X_2] + \mathbb{E}[X_3] + \mathbb{E}[X_4].
\end{aligned}\]
Consider $X_1$. $\mathbb{P(X_1 = 1)} = 1$, since no matter what card is drawn first, it will be from a unique suit. So, $\mathbb{E}[X_1] = 1$ $$$$
Next, consider $X_2$. Since one suit has already been accounted for, three suits remain. The probability that a drawn card belongs to one of the three unaccounted for suits is $\frac{3}{4}$. Hence, 
\[\begin{aligned}
    X_2 &\sim \text{Geo}\left(\frac{3}{4}\right) \\
    \Rightarrow \mathbb{E}[X_2] &= \frac{4}{3}.
\end{aligned}\]
Following this reasoning for $X_3$ and $X_4$, we find
\[\begin{aligned}
    X_3 &\sim \text{Geo}\left(\frac{2}{4}\right) \\
    \Rightarrow \mathbb{E}[X_3] &= \frac{4}{2}, \quad \text{and} \\
    X_4 &\sim \text{Geo}\left(\frac{1}{4}\right) \\
    \Rightarrow \mathbb{E}[X_4] &= \frac{4}{1}. \\
\end{aligned}\]
Substituting, we conclude
\[\begin{aligned}
    \mathbb{E}[Z] &= 1 + \frac{4}{3} + \frac{4}{2} + \frac{4}{1} \\
    &= \frac{25}{3}.
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "25/3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "QLnB4vdM9Izyx8I7I2s8",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:24:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9376446,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Repetitious Game II",
    "topic": "probability",
    "urlEnding": "repetitious-game-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "QLnB4vdM9Izyx8I7I2s8",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Repetitious Game II",
    "topic": "probability",
    "urlEnding": "repetitious-game-ii"
  }
}
```
