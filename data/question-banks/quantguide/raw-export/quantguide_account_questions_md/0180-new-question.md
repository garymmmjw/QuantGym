# QuantGuide Question

## 180. Perfect Square

**Metadata**

- ID: `9Rk6wfki69llQdPWmpak`
- URL: https://www.quantguide.io/questions/new-question
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: DRW
- Source: https://math.stackexchange.com/questions/4168160/probability-that-the-sum-of-two-integers-in-1-dots-n-equals-a-perfect-squ
- Tags: Combinatorics
- Premium: False
- Solution Free: True
- Version: 3
- Last Edited: 2024-2-18 16:28:26 America/New_York
- Last Edited By: Matt

### 题干

Let $p_n$ be the probability that $c+d$ is a perfect square when the integers $c$ and $d$ are selected independently at random from the set $\{1, \ldots, n\}$. Express this limit in the form $r(\sqrt{s}-t)$ where $s$ and $t$ are integers and $r$ is a rational number.

### Hint

When you choose two integers uniformly at random in $\{1,2, \ldots, n\}$, the probability that the sum is $i$ is
$$
P(i)=\frac{n-|n+1-i|}{n^2}=\frac{1}{n^2} \begin{cases}i-1 & 2 \leq i \leq n+1 \\ 2 n+1-i & n+1 \leq i \leq 2 n \\ 0 & \text { else }\end{cases}
$$

### 解答

When you choose two integers uniformly at random in $\{1,2, \ldots, n\}$, the probability that the sum is $i$ is
$$
P(i)=\frac{n-|n+1-i|}{n^2}=\frac{1}{n^2} \begin{cases}i-1 & 2 \leq i \leq n+1 \\ 2 n+1-i & n+1 \leq i \leq 2 n \\ 0 & \text { else }\end{cases}
$$

So you get
$$
P(s q)=\sum_{k=2}^{\lfloor\sqrt{n}\rfloor} \frac{k^2-1}{n^2}+\sum_{k=\lfloor\sqrt{n}\rfloor+1}^{\lfloor\sqrt{2 n}\rfloor} \frac{2 n+1-k^2}{n^2}
$$

And doing the sums gives
$$
P(s q)=\frac{\lfloor\sqrt{n}\rfloor\left(2\lfloor\sqrt{n}\rfloor^2+3\lfloor\sqrt{n}\rfloor-6 n-5\right)}{3 n^2}-\frac{\lfloor\sqrt{2 n}\rfloor\left(2\lfloor\sqrt{2 n}\rfloor^2+3\lfloor\sqrt{2 n}\rfloor-12 n-5\right)}{6 n^2} .
$$

Letting $\epsilon=\sqrt{n}-\lfloor\sqrt{n}\rfloor$ and $\delta=\sqrt{2 n}-\lfloor\sqrt{2 n}\rfloor$, where $0 \leq \epsilon, \delta<1$, we have
$$
P(s q)=\frac{4(\sqrt{2}-1)}{3 \sqrt{n}}+O\left(\frac{1}{n^{3 / 2}}\right) .
$$

So the limit exists and is equal to $(4 / 3)(\sqrt{2}-1)$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "(4/3)*((2^.5)-1)"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "9Rk6wfki69llQdPWmpak",
    "internalDifficulty": 3,
    "isAIType": false,
    "isPremium": false,
    "isPublished": false,
    "isSolutionFree": true,
    "lastEditedAt": "2024-2-18 16:28:26 America/New_York",
    "lastEditedBy": "Matt",
    "orderId": 2612953,
    "source": "https://math.stackexchange.com/questions/4168160/probability-that-the-sum-of-two-integers-in-1-dots-n-equals-a-perfect-squ",
    "status": "in review",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Perfect Square",
    "topic": "probability",
    "urlEnding": "new-question",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "medium",
    "id": "G3ygzFLKCywhexNAk8uA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "10th Double",
    "topic": "probability",
    "urlEnding": "new-question"
  }
}
```
