# QuantGuide Question

## 1038. Even Steven

**Metadata**

- ID: `ZtUqYRTGM9BSXjxqiTB7`
- URL: https://www.quantguide.io/questions/even-steven
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Kaushik - Cut the Knot
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-21 13:47:11 America/New_York
- Last Edited By: Gabe

### 题干

Steven and his friend are playing a game where the first person to flip a heads wins. Steven's friend sadly only has a biased coin with a probability of $0.4$ to get flip a heads. Since the friend is at a disadvantage, they decided that he would get the chance to flip first and then they alternate who flips their coin. Steven has a special coin where he can choose the probability it comes up heads. Because Steven is a fair man, he wants this game to be fair to both players. What probability of heads should Steven set his magical coin at to make this game fair?

### Hint

Find the probability that the person flipping at each turn can win and compare them. 

### 解答

Let $p$ be the probability that Steven should set his coin to. Lets find the probability that Steven's friend wins. Since this game can go on forever, we should expect to have an infinite sum. Steven's friend can win on the first flip with probability $0.4$, on the third flip with probability $0.6\cdot(1-p)\cdot0.4$, on the fifth with probability $0.6^{2}\cdot(1-p)^{2}\cdot0.4$, so on and so forth. This is because if Steven's friend is to win on the $2k+1$st flip, each of the first $2k$ flips must be tails, which occur with probability $0.6$ for Steven and $1-p$ for his friend.

$$$$

The probability Steven wins is only affected by even number rolls. Steven can win on the second roll with probability $0.6\cdot p$, the fourth roll with probability $0.6^2\cdot(1-p)\cdot(p)$, the sixth roll with probability $0.6^3\cdot(1-p)^2\cdot(p)$, and onwards. We can equate these two infinite sums as follows:
$$$$
$$0.4\cdot(1+0.6\cdot(1-p)+0.6^2\cdot(1-p)^2+\dots)=0.6\cdot p\cdot(1+0.6\cdot(1-p)+0.6^2\cdot(1-p)^2+\dots)$$
Which simplifies to:
$$p=\frac{0.4}{0.6}=\frac{2}{3}$$.
Thus Steven should set his the heads probability on his coin to $\frac{2}{3}$ to make this game fair for him and his friend.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZtUqYRTGM9BSXjxqiTB7",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-21 13:47:11 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8466511,
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [],
    "title": "Even Steven",
    "topic": "probability",
    "urlEnding": "even-steven",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ZtUqYRTGM9BSXjxqiTB7",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Even Steven",
    "topic": "probability",
    "urlEnding": "even-steven"
  }
}
```
