# QuantGuide Question

## 281. Sock Drawer I

**Metadata**

- ID: `xR3ulaGopUxehkm8JBnn`
- URL: https://www.quantguide.io/questions/sock-drawer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-19 10:20:58 America/New_York
- Last Edited By: Gabe

### 题干

A drawer contains blue and green socks only. When two socks are drawn at random from the drawer without replacement, the probability that both are blue socks is $\frac{1}{2}$. What is the minimum number of socks that could be in the drawer?

### Hint

Let there be $b$ blue socks and $g$ green socks. Then the probability of the first sock being blue is $\frac{b}{b+g}$; and if the first sock is blue, the probability of the second sock being blue is $\frac{b-1}{b+g-1}$.

### 解答

Let there be $b$ blue socks and $g$ green socks. Then the probability of the first sock being blue is $\frac{b}{b+g}$; and if the first sock is blue, the probability of the second sock being blue is $\frac{b-1}{b+g-1}$. The probability that both are blue is given to be $\frac{1}{2}$, or $\frac{b}{b+g} \cdot \frac{b-1}{b+g-1} = \frac{1}{2}$

$$$$

One could start with $g=1$ and try successive values of $r$, then go to $g=2$, and so on, to find that $g=1$ and $b=3$ satisfy the equation. Thus, there are a total of $4$ socks at minimum.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "xR3ulaGopUxehkm8JBnn",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-19 10:20:58 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2165084,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Sock Drawer I",
    "topic": "probability",
    "urlEnding": "sock-drawer",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "xR3ulaGopUxehkm8JBnn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Sock Drawer I",
    "topic": "probability",
    "urlEnding": "sock-drawer"
  }
}
```
